"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface SeatMapEditorProps {
  gridSize: { rows: number; cols: number }
  gridGap: number
  seatMap: Record<string, any>
  sections: Array<{ id: string; name: string; color: string }>
  activeSection: string
  selectedSeat: string | null
  onSeatToggle: (row: number, col: number) => void
  onSeatSelect: (key: string) => void
}

// Update the getColumnLabel function to be more flexible
const getColumnLabel = (index: number): string => {
  return String.fromCharCode(65 + index) // 65 is ASCII for 'A'
}

// Add a function to get row label for inverted legend
const getRowLabel = (index: number): string => {
  return String.fromCharCode(65 + index) // 65 is ASCII for 'A'
}

// Update the SeatMapEditor component to handle inverted legend
export default function SeatMapEditor({
  gridSize,
  gridGap,
  seatMap,
  sections,
  activeSection,
  selectedSeat,
  onSeatToggle,
  onSeatSelect,
}: SeatMapEditorProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [lastCell, setLastCell] = useState<string | null>(null)
  const [showIds, setShowIds] = useState(true)

  // Get the active section
  const activeSecObj = sections.find((s) => s.id === activeSection)
  const isLegendInverted = activeSecObj?.legendTracking && activeSecObj?.invertLegend

  // Create a grid of cells
  const grid = Array.from({ length: gridSize.rows }, (_, rowIndex) =>
    Array.from({ length: gridSize.cols }, (_, colIndex) => {
      const key = `${rowIndex}-${colIndex}`
      const cell = seatMap[key]
      return {
        key,
        row: rowIndex,
        col: colIndex,
        isSeat: !!cell,
        section: cell?.section || null,
        id: cell?.id || null,
      }
    }),
  )

  const handleMouseDown = (row: number, col: number) => {
    setIsDragging(true)
    onSeatToggle(row, col)
    setLastCell(`${row}-${col}`)
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging) {
      const cellKey = `${row}-${col}`
      if (cellKey !== lastCell) {
        onSeatToggle(row, col)
        setLastCell(cellKey)
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setLastCell(null)
  }

  const handleSeatClick = (key: string) => {
    if (seatMap[key]) {
      onSeatSelect(key)
    }
  }

  // Add global mouse up handler to stop dragging even if mouse is released outside the grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setLastCell(null)
    }

    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [])

  // Find the active section color
  const activeSectionColor = sections.find((s) => s.id === activeSection)?.color || "#000000"

  return (
    <div className=" p-4 border shadow !bg-base-100 border-base-300 rounded-md">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: activeSectionColor }} />
          <span className="text-sm font-medium">
            {sections.find((s) => s.id === activeSection)?.name || "Sección desconocida"}
          </span>
          <span className="text-xs text-muted-foreground ml-2">Click o arrastrar para agregar/remover asientos</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={showIds}
 
              onChange={(e) => setShowIds(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            Mostrar IDs
          </label>
        </div>
      </div>

      <div className="relative">
        {/* Column headers - show numbers if legend is inverted, letters otherwise */}
        <div
          className={`grid gap-${gridGap}`}
          style={{
            marginLeft: "32px",
            gridTemplateColumns: `repeat(${gridSize.cols}, 32px)`,
            width: "fit-content",
          }}
        >
          {Array.from({ length: gridSize.cols }).map((_, colIndex) => (
            <div
              key={`col-${colIndex}`}
              className="flex items-center justify-center text-xs font-medium text-muted-foreground h-8"
            >
              {isLegendInverted ? colIndex + 1 : getColumnLabel(colIndex)}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Row headers - show letters if legend is inverted, numbers otherwise */}
          <div className={`flex flex-col gap-${gridGap}`}>
            {Array.from({ length: gridSize.rows }).map((_, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                className="flex items-center justify-center text-xs font-medium text-muted-foreground"
                style={{ width: "32px", height: "32px" }}
              >
                {isLegendInverted ? getRowLabel(rowIndex).toUpperCase() : rowIndex + 1}
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div
            className={`grid gap-${gridGap}`}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridSize.cols}, 32px)`,
              gridAutoRows: "32px",
              width: "fit-content",
            }}
            onMouseLeave={() => setIsDragging(false)}
          >
            {grid.flat().map((cell) => {
              const section = sections.find((s) => s.id === cell.section)
              const isSelected = selectedSeat === cell.key

              // Determine grid position format based on legend orientation
              const gridPosition = isLegendInverted
                ? `${cell.col + 1}${String.fromCharCode(65 + cell.row)}`
                : `${String.fromCharCode(65 + cell.row)}${cell.col + 1}`

              return (
                <div
                  key={cell.key}
                  id={cell.id || `seat-${cell.row}-${cell.col}`}
                  className={cn(
                    "w-8 h-8 border border-gray-200 flex items-center justify-center transition-colors relative seat-zone",
                    "cursor-pointer hover:bg-gray-100",
                    isSelected && "ring-2 ring-primary",
                  )}
                  onMouseDown={() => handleMouseDown(cell.row, cell.col)}
                  onMouseEnter={() => handleMouseEnter(cell.row, cell.col)}
                  onMouseUp={handleMouseUp}
                  onClick={() => handleSeatClick(cell.key)}
                  data-grid-position={gridPosition}
                >
                  {cell.isSeat && (
                    <>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] text-white font-medium"
                        style={{ backgroundColor: section?.color || "#000000" }}
                      >
                        {showIds && cell.id && cell.id.length <= 3 ? cell.id : ""}
                      </div>

                      {showIds && cell.id && cell.id.length > 3 && (
                        <div className="absolute -bottom-4 left-0 right-0 text-center text-[8px] text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
                          {cell.id}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Tamaño: {gridSize.rows} × {gridSize.cols}
      </div>
    </div>
  )
}

