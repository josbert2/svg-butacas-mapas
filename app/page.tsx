"use client"

import { useState } from "react"
import SeatMapEditor from "@/components/seat-map-editor"
import { SeatMapControls } from "@/components/seat-map-controls"
import { SeatMapPreview } from "@/components/seat-map-preview"
import { SeatMapExport } from "@/components/seat-map-export"
import { SectionManager } from "@/components/section-manager"
import { SeatList } from "@/components/seat-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SeatMapImport } from "@/components/seat-map-import"

export default function Home() {
  // Update the sections state to include invertLegend
  const [sections, setSections] = useState([
    {
      id: "section1",
      name: "Main Floor",
      color: "#0084d7",
      idPrefix: "A",
      idStartNumber: 1,
      autoId: true,
      legendTracking: false,
      invertLegend: false,
    },
    {
      id: "section2",
      name: "Field",
      color: "#008131",
      idPrefix: "B",
      idStartNumber: 1,
      autoId: true,
      legendTracking: false,
      invertLegend: false,
    },
    {
      id: "section3",
      name: "Balcony",
      color: "#004c91",
      idPrefix: "C",
      idStartNumber: 1,
      autoId: true,
      legendTracking: false,
      invertLegend: false,
    },
  ])
  const [activeSection, setActiveSection] = useState("section1")
  const [seatMap, setSeatMap] = useState<Record<string, any>>({})
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const [manualId, setManualId] = useState("")

  // Add a new state for grid gap
  const [gridGap, setGridGap] = useState(1) // Default gap of 1 (4px in Tailwind)

  // Add state for grid size
  const [gridSize, setGridSize] = useState({ rows: 10, cols: 10 })

  // Helper function to get column label
  const getColumnLabel = (index: number): string => {
    return String.fromCharCode(65 + index) // 65 is ASCII for 'A'
  }

  // Add a helper function to get row label (for inverted legend)
  const getRowLabel = (index: number): string => {
    return String.fromCharCode(65 + index) // Convert to A, B, C, etc.
  }

  // Update the handleSeatToggle function to fix the regular legend tracking format
  const handleSeatToggle = (row: number, col: number) => {
    setSeatMap((prev) => {
      const key = `${row}-${col}`

      if (prev[key] && prev[key].section === activeSection) {
        // If clicking on a seat from the same section, remove it
        const { [key]: _, ...rest } = prev
        return rest
      } else {
        // Otherwise add or update the seat
        const section = sections.find((s) => s.id === activeSection)

        // If the seat already exists, preserve its properties
        const existingSeat = prev[key]
        if (existingSeat) {
          return {
            ...prev,
            [key]: {
              ...existingSeat,
              section: activeSection,
            },
          }
        }

        // Generate ID based on section settings
        let seatId = ""

        // If legend tracking is enabled, use grid position as ID
        if (section?.legendTracking) {
          if (section.invertLegend) {
            // Create ID like "4A" (column number + row letter)
            seatId = `${col + 1}${String.fromCharCode(65 + row)}`
          } else {
            // Create ID like "A4" (row letter + column number)
            seatId = `${String.fromCharCode(65 + col)}${row + 1}`
          }
        } else if (section?.autoId) {
          // Count existing seats in this section
          const sectionSeats = Object.values(prev).filter((seat) => seat.section === activeSection)
          const nextNumber = section.idStartNumber + sectionSeats.length

          // Generate ID using the section's current prefix and next number
          seatId = `${section.idPrefix}${nextNumber}`
        }

        return {
          ...prev,
          [key]: {
            section: activeSection,
            type: "seat",
            id: seatId,
          },
        }
      }
    })
  }

  // Modify the updateSection function to properly handle applyMode for all changes
  const updateSection = (id: string, data: any, applyMode: "all" | "new" = "new") => {
    // First, update the section in the sections state
    setSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...data } : section)))

    // Get the updated section with the new data
    const updatedSection = sections.find((s) => s.id === id)
    if (!updatedSection) return

    const newSection = { ...updatedSection, ...data }

    // If we're only applying changes to new seats, we don't need to update existing seats
    if (applyMode === "new") {
      return // Exit early - no changes to existing seats
    }

    // If we're here, it means applyMode is "all" and we should update existing seats

    // Handle legend tracking changes
    if (data.legendTracking !== undefined || data.invertLegend !== undefined) {
      setSeatMap((prev) => {
        const newMap = { ...prev }

        if (newSection.legendTracking) {
          // Update all seats in this section to use grid position as ID
          Object.entries(newMap).forEach(([key, seat]) => {
            if (seat.section === id && !seat.customId) {
              const [row, col] = key.split("-").map(Number)

              // Generate ID based on whether legend is inverted
              const newId = newSection.invertLegend
                ? `${col + 1}${String.fromCharCode(65 + row)}`
                : `${String.fromCharCode(65 + col)}${row + 1}`

              newMap[key] = {
                ...seat,
                id: newId,
                customId: false, // Reset custom ID flag
              }
            }
          })
        } else if (newSection.autoId) {
          // If switching from legend tracking to auto ID, regenerate sequential IDs
          // Get all seats from this section that don't have custom IDs
          const sectionSeats = Object.entries(newMap)
            .filter(([_, seat]) => seat.section === id && !seat.customId)
            .sort(([keyA], [keyB]) => {
              const [rowA, colA] = keyA.split("-").map(Number)
              const [rowB, colB] = keyB.split("-").map(Number)
              return rowA === rowB ? colA - colB : rowA - rowB
            })

          // Update IDs only for auto-generated seats
          sectionSeats.forEach(([key, seat], index) => {
            newMap[key] = {
              ...seat,
              id: `${newSection.idPrefix}${newSection.idStartNumber + index}`,
            }
          })
        }

        return newMap
      })
    }
    // Handle auto ID changes (prefix or start number)
    else if (data.autoId !== undefined || data.idPrefix !== undefined || data.idStartNumber !== undefined) {
      if (newSection.autoId && !newSection.legendTracking) {
        setSeatMap((prev) => {
          const newMap = { ...prev }

          // Get all seats from this section that don't have custom IDs
          const sectionSeats = Object.entries(newMap)
            .filter(([_, seat]) => seat.section === id && !seat.customId)
            .sort(([keyA], [keyB]) => {
              const [rowA, colA] = keyA.split("-").map(Number)
              const [rowB, colB] = keyB.split("-").map(Number)
              return rowA === rowB ? colA - colB : rowA - rowB
            })

          // Update IDs for all non-custom seats
          sectionSeats.forEach(([key, seat], index) => {
            newMap[key] = {
              ...seat,
              id: `${newSection.idPrefix}${newSection.idStartNumber + index}`,
            }
          })

          return newMap
        })
      }
    }
  }

  // Update the addSection function to include invertLegend
  const addSection = (section: any) => {
    setSections((prev) => [
      ...prev,
      {
        id: `section${prev.length + 1}`,
        name: section.name || `Section ${prev.length + 1}`,
        color: section.color || "#000000",
        idPrefix: section.idPrefix || String.fromCharCode(65 + prev.length), // A, B, C, etc.
        idStartNumber: section.idStartNumber || 1,
        autoId: section.autoId !== undefined ? section.autoId : true,
        legendTracking: section.legendTracking !== undefined ? section.legendTracking : false,
        invertLegend: section.invertLegend !== undefined ? section.invertLegend : false,
      },
    ])
  }

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((section) => section.id !== id))
    // Remove all seats from this section
    setSeatMap((prev) => {
      const newMap = { ...prev }
      Object.keys(newMap).forEach((key) => {
        if (newMap[key].section === id) {
          delete newMap[key]
        }
      })
      return newMap
    })
  }

  const handleSeatSelect = (key: string) => {
    setSelectedSeat(key)
    setManualId(seatMap[key]?.id || "")
  }

  // Modify the updateSeatId function to mark manually edited seats
  const updateSeatId = (id: string) => {
    if (selectedSeat && id.trim()) {
      setSeatMap((prev) => ({
        ...prev,
        [selectedSeat]: {
          ...prev[selectedSeat],
          id,
          customId: true, // Mark this seat as having a custom ID
        },
      }))
    }
  }

  // Function to update a seat (for the seat list)
  const updateSeat = (key: string, data: any) => {
    if (key && seatMap[key]) {
      setSeatMap((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...data,
          customId: data.id ? true : prev[key].customId, // Mark as custom if ID is changed
        },
      }))
    }
  }

  // Function to remove a seat
  const removeSeat = (key: string) => {
    if (key && seatMap[key]) {
      setSeatMap((prev) => {
        const { [key]: _, ...rest } = prev
        return rest
      })

      if (selectedSeat === key) {
        setSelectedSeat(null)
        setManualId("")
      }
    }
  }

  // Update the handleImport function to handle inverted legend
  const handleImport = ({
    seatMap: importedSeats,
    gridSize: newGridSize,
  }: {
    seatMap: Record<string, any>
    gridSize: { rows: number; cols: number }
  }) => {
    // Update grid size
    setGridSize(newGridSize)

    // Get the active section for legend tracking check
    const activeSecObj = sections.find((s) => s.id === activeSection)
    const useLegendTracking = activeSecObj?.legendTracking || false
    const useInvertedLegend = activeSecObj?.invertLegend || false

    // Merge imported seats with existing seats
    setSeatMap((prev) => {
      const newSeatMap = { ...prev }

      // Add new seats
      Object.entries(importedSeats).forEach(([key, seat]) => {
        // If a seat already exists at this position, preserve its ID
        if (prev[key]) {
          newSeatMap[key] = {
            ...seat,
            id: prev[key].id,
            customId: prev[key].customId,
          }
        } else {
          // For new seats, check if we should use legend tracking
          if (useLegendTracking) {
            const [row, col] = key.split("-").map(Number)

            // Generate ID based on whether legend is inverted
            const newId = useInvertedLegend
              ? `${col + 1}${String.fromCharCode(65 + row)}`
              : `${String.fromCharCode(65 + col)}${row + 1}`

            newSeatMap[key] = {
              ...seat,
              id: newId,
            }
          } else {
            newSeatMap[key] = seat
          }
        }
      })

      return newSeatMap
    })
  }


  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center">
        <h1 className="text-3xl font-bold mb-6">Butacas Edición </h1>
        <div className="ml-auto">
          <a className="btn btn-neutral" href="/layout-editor">
            Crear Mapa de zonas
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="editor">
            <TabsList className="mb-4">
              <TabsTrigger value="editor">Editar</TabsTrigger>
              <TabsTrigger value="preview">Previsualizar</TabsTrigger>
              <TabsTrigger value="seats">Lista de butacas</TabsTrigger>
            </TabsList>
            <TabsContent value="editor">
              <SeatMapEditor
                gridSize={gridSize}
                gridGap={gridGap}
                seatMap={seatMap}
                sections={sections}
                activeSection={activeSection}
                selectedSeat={selectedSeat}
                onSeatToggle={handleSeatToggle}
                onSeatSelect={handleSeatSelect}
              />

              {selectedSeat && (
                <div className=" text-card-foreground mt-4 p-4 border shadow  border-base-300 rounded-md"
                  style={{
                    backgroundColor: "#FAF7F5 ",
                  }}>
                  <h3 className="text-sm font-medium mb-2">Editar id de butaca</h3> 
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      className="input"
                      placeholder="Enter seat ID"
                    />
                    <button
                      onClick={() => updateSeatId(manualId)}
                      className="btn btn-primary text-base-100"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="preview">
              <SeatMapPreview gridSize={gridSize} gridGap={gridGap} seatMap={seatMap} sections={sections} />
            </TabsContent>
            <TabsContent value="seats">
              <SeatList
                seatMap={seatMap}
                sections={sections}
                onSeatSelect={handleSeatSelect}
                onSeatUpdate={updateSeat}
                onSeatRemove={removeSeat}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <SeatMapControls
            gridSize={gridSize}
            gridGap={gridGap}
            onGridSizeChange={setGridSize}
            onGridGapChange={setGridGap}
          />

          <SeatMapImport onImport={handleImport} activeSection={activeSection} />

          <SectionManager
            sections={sections}
            activeSection={activeSection}
            onSectionSelect={setActiveSection}
            onSectionUpdate={updateSection}
            onSectionAdd={addSection}
            onSectionRemove={removeSection}
          />

          <SeatMapExport gridSize={gridSize} gridGap={gridGap} seatMap={seatMap} sections={sections} />
        </div>
      </div>
    </main>
  )
}

