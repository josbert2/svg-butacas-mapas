"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Copy, FileJson } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface SeatMapExportProps {
  gridSize: { rows: number; cols: number }
  gridGap: number
  seatMap: Record<string, any>
  sections: Array<{
    id: string
    name: string
    color: string
    idPrefix?: string
    idStartNumber?: number
    autoId?: boolean
    legendTracking?: boolean
    invertLegend?: boolean
  }>
}

export function SeatMapExport({ gridSize, gridGap, seatMap, sections }: SeatMapExportProps) {
  const [copied, setCopied] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)
  const [showIdsInExport, setShowIdsInExport] = useState(true)
  const [addCustomDataAttributes, setAddCustomDataAttributes] = useState(false)

  // Add the getColumnLabel helper function
  const getColumnLabel = (index: number): string => {
    return String.fromCharCode(65 + index) // 65 is ASCII for 'A'
  }

  // Update the generateSVG function to handle inverted legend
  const generateSVG = () => {
    const cellSize = 14
    const gapSize = gridGap * 1 // Convert Tailwind gap to pixels (approximation)
    const padding = 20
    const width = gridSize.cols * cellSize + (gridSize.cols - 1) * gapSize + padding * 2 + 20
    const height = gridSize.rows * cellSize + (gridSize.rows - 1) * gapSize + padding * 2 + 20

    // Group seats by section and track indices
    const seatsBySection: Record<string, Array<[number, number, string, number]>> = {}
    const sectionIndices: Record<string, number> = {}
    const sectionHasInvertedLegend: Record<string, boolean> = {}

    // First pass: group seats by section
    Object.entries(seatMap).forEach(([key, seat]) => {
      const sectionId = seat.section
      const section = sections.find((s) => s.id === sectionId)

      if (!seatsBySection[sectionId]) {
        seatsBySection[sectionId] = []
        sectionIndices[sectionId] = 0
        sectionHasInvertedLegend[sectionId] = (section?.legendTracking && section?.invertLegend) || false
      }
    })

    // Second pass: sort seats within each section (by row, then column)
    Object.entries(seatMap).forEach(([key, seat]) => {
      const [row, col] = key.split("-").map(Number)
      const sectionId = seat.section
      seatsBySection[sectionId].push([row, col, seat.id || "", 0]) // Placeholder for index
    })

    // Sort seats within each section
    Object.keys(seatsBySection).forEach((sectionId) => {
      seatsBySection[sectionId].sort((a, b) => {
        // Sort by row first, then by column
        if (a[0] !== b[0]) return a[0] - b[0]
        return a[1] - b[1]
      })

      // Assign position indices
      seatsBySection[sectionId].forEach((seat, index) => {
        seat[3] = index // Set the position index
      })
    })

    // Create SVG content
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${width} ${height}">
<defs>
  <style>
    .seat { stroke-width: 0px; }
    .seat-zone { }
    .seat-id { font-size: 6px; fill: white; text-anchor: middle; dominant-baseline: central; font-weight: bold; }
    .grid-label { font-size: 10px; fill: #666; text-anchor: middle; dominant-baseline: central; }
  </style>
</defs>
`

    // Check if any section has inverted legend
    const hasAnyInvertedLegend = Object.values(sectionHasInvertedLegend).some((inverted) => inverted)

    // Update column headers positioning
    svgContent += `  <g class="column-headers">
`
    for (let i = 0; i < gridSize.cols; i++) {
      const label = hasAnyInvertedLegend ? (i + 1).toString() : getColumnLabel(i)
      svgContent += `    <text class="grid-label" x="${padding + i * (cellSize + gapSize) + cellSize / 2 + 20}" y="${padding / 2 + 10}">${label}</text>
`
    }
    svgContent += `  </g>
`

    // Update row headers positioning
    svgContent += `  <g class="row-headers">
`
    for (let i = 0; i < gridSize.rows; i++) {
      const label = hasAnyInvertedLegend ? String.fromCharCode(65 + i) : (i + 1).toString()
      svgContent += `    <text class="grid-label" x="${padding / 2 + 10}" y="${padding + i * (cellSize + gapSize) + cellSize / 2 + 20}">${label}</text>
`
    }
    svgContent += `  </g>
`

    // Update seat positioning
    Object.entries(seatsBySection).forEach(([sectionId, seats]) => {
      const section = sections.find((s) => s.id === sectionId)
      if (!section) return

      svgContent += `  <g id="${section.name.replace(/\s+/g, "_")}">
`

      seats.forEach(([row, col, id, position]) => {
        const cx = padding + col * (cellSize + gapSize) + cellSize / 2 + 20
        const cy = padding + row * (cellSize + gapSize) + cellSize / 2 + 20
        const seatId = id || `seat-${row}-${col}`

        // Determine grid position format based on section's legend orientation
        const isInverted = sectionHasInvertedLegend[sectionId]
        const gridPosition = isInverted
          ? `${col + 1}${String.fromCharCode(65 + row)}`
          : `${String.fromCharCode(65 + row)}${col + 1}`

        // Generate custom data attributes if enabled
        let customDataAttrs = ""
        if (addCustomDataAttributes && seatId) {
          // Create data-name by replacing any non-alphanumeric characters with hyphens
          const dataName = seatId.replace(/([^a-zA-Z0-9])/g, "-")
          customDataAttrs = ` data-name="${dataName}" data-position="${position}"`
        }

        svgContent += `    <circle class="seat butaca-zone" data-nombre="${seatId}" id="${seatId}" fill="${section.color}" cx="${cx}" cy="${cy}" r="${cellSize / 2 - 2}" data-grid-position="${gridPosition}"${customDataAttrs}/>
`

        // Only add text if showIdsInExport is true
        if (showIdsInExport && id && id.length <= 3) {
          svgContent += `    <text class="seat-id" x="${cx}" y="${cy}">${id}</text>
`
        }
      })

      svgContent += `  </g>
`
    })

    svgContent += `</svg>`

    return svgContent
  }

  // Update the generateJSON function to handle inverted legend
  const generateJSON = () => {
    // Group seats by section for indexing
    const seatsBySection: Record<string, Array<[string, any]>> = {}
    const sectionHasInvertedLegend: Record<string, boolean> = {}

    // First pass: group seats by section
    Object.entries(seatMap).forEach(([key, seat]) => {
      const sectionId = seat.section
      const section = sections.find((s) => s.id === sectionId)

      if (!seatsBySection[sectionId]) {
        seatsBySection[sectionId] = []
        sectionHasInvertedLegend[sectionId] = (section?.legendTracking && section?.invertLegend) || false
      }
      seatsBySection[sectionId].push([key, seat])
    })

    // Sort seats within each section
    Object.keys(seatsBySection).forEach((sectionId) => {
      seatsBySection[sectionId].sort((a, b) => {
        const [rowA, colA] = a[0].split("-").map(Number)
        const [rowB, colB] = b[0].split("-").map(Number)
        // Sort by row first, then by column
        if (rowA !== rowB) return rowA - rowB
        return colA - colB
      })
    })

    // Create position-indexed seat data
    const seatData = []

    Object.entries(seatsBySection).forEach(([sectionId, seats]) => {
      seats.forEach(([key, seat], position) => {
        const [row, col] = key.split("-").map(Number)
        const id = seat.id || null
        const isInverted = sectionHasInvertedLegend[sectionId]

        // Determine grid position format based on section's legend orientation
        const gridPosition = isInverted
          ? `${row + 1}${String.fromCharCode(65 + col)}`
          : `${getColumnLabel(col)}${row + 1}`

        // Generate custom data attributes if enabled
        let customData = {}
        if (addCustomDataAttributes && id) {
          const dataName = id.replace(/([^a-zA-Z0-9])/g, "-")
          customData = {
            dataName,
            dataPosition: position,
          }
        }

        seatData.push({
          position: { row, col },
          section: seat.section,
          id,
          sectionName: sections.find((s) => s.id === seat.section)?.name || "",
          gridPosition,
          sectionPosition: position,
          ...customData,
        })
      })
    })

    const data = {
      gridSize,
      sections: sections.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        idPrefix: s.idPrefix,
        idStartNumber: s.idStartNumber,
        autoId: s.autoId,
        legendTracking: s.legendTracking,
        invertLegend: s.invertLegend,
      })),
      seats: seatData,
      exportOptions: {
        showIds: showIdsInExport,
        customDataAttributes: addCustomDataAttributes,
      },
    }

    return JSON.stringify(data, null, 2)
  }

  const handleCopy = () => {
    const svgString = generateSVG()
    navigator.clipboard.writeText(svgString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyJson = () => {
    const jsonString = generateJSON()
    navigator.clipboard.writeText(jsonString)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  const handleDownload = () => {
    const svgString = generateSVG()
    const blob = new Blob([svgString], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "seating-map.svg"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadJson = () => {
    const jsonString = generateJSON()
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "seating-map.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="mt-4 p-4 border shadow !bg-base-100 border-base-300 rounded-md">
      <CardHeader>
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-ids" className="text-sm">
                Mostrar IDs en exportación
              </Label>
              <Switch id="show-ids"  className="toggle toggle-sm toggle-primary" checked={showIdsInExport} onCheckedChange={setShowIdsInExport} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="custom-data" className="text-sm">
                Anadir atributos personalizados en exportación
              </Label>
              <Switch id="custom-data"  className="toggle toggle-sm toggle-primary" checked={addCustomDataAttributes} onCheckedChange={setAddCustomDataAttributes} />
            </div>

            {addCustomDataAttributes && (
              <div className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-muted">
                Anadir <code className="bg-muted px-1 rounded">data-name="Q-1"</code> y {" "}  
                <code className="bg-muted px-1 rounded">data-position="0"</code> attributes
                <p className="mt-1">
                  Posición es el indice del asiento dentro de su sección (ordenado por filas, luego columnas)
                </p>
              </div>
            )}
          </div>
      
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCopy}  variant={'outline'} className="btn w-full text-base-100 text-center btn-neutral">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copiado!" : "Copy SVG"}
            </Button>
            <Button onClick={handleDownload} variant={'outline'} className="btn w-full text-base-100 text-center btn-primary">
              <Download className="h-4 w-4 mr-2" />
              Descargar SVG
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCopyJson}  variant={'outline'} className="btn w-full text-base-100 text-center btn-neutral">
              <FileJson className="h-4 w-4 mr-2" />
              {copiedJson ? "Copiado!" : "Copy JSON"}
            </Button>
            <Button onClick={handleDownloadJson} variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Descargar JSON
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Total de butacas: {Object.keys(seatMap).length}</p> 
            <p>
              Tamaño del grid: {gridSize.rows} × {gridSize.cols}
            </p>
            <p>Secciones: {sections.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

