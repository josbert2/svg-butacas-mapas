"use client"

import { useRef, useState } from "react"

interface SeatMapPreviewProps {
  gridSize: { rows: number; cols: number }
  gridGap: number
  seatMap: Record<string, any>
  sections: Array<{ id: string; name: string; color: string }>
}

// Add the getColumnLabel helper function at the top of the component
const getColumnLabel = (index: number): string => {
  return String.fromCharCode(65 + index) // 65 is ASCII for 'A'
}

// Update the SeatMapPreview component to handle inverted legend
export function SeatMapPreview({ gridSize, gridGap, seatMap, sections }: SeatMapPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [showIds, setShowIds] = useState(true)

  // Calculate dimensions with gap
  const cellSize = 14
  const gapSize = gridGap * 1 // Convert Tailwind gap to pixels (approximation)
  const padding = 20
  const width = gridSize.cols * cellSize + (gridSize.cols - 1) * gapSize + padding * 2
  const height = gridSize.rows * cellSize + (gridSize.rows - 1) * gapSize + padding * 2

  // Group seats by section for the legend
  const sectionCounts: Record<string, number> = {}
  Object.values(seatMap).forEach((seat) => {
    sectionCounts[seat.section] = (sectionCounts[seat.section] || 0) + 1
  })

  // Group seats by section to check for inverted legend
  const seatsBySection: Record<string, boolean> = {}
  Object.entries(seatMap).forEach(([_, seat]) => {
    const sectionId = seat.section
    const section = sections.find((s) => s.id === sectionId)
    if (section && !seatsBySection[sectionId]) {
      seatsBySection[sectionId] = section.legendTracking && section.invertLegend
    }
  })

  return (
    <div className="border rounded-lg p-4 bg-white overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Preview</h3>
        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground">Total seats: {Object.keys(seatMap).length}</div>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={showIds}
              onChange={(e) => setShowIds(e.target.checked)}
              className="h-4 w-4"
            />
            Show IDs
          </label>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <svg
          ref={svgRef}
          width={width + 20} // Add extra space for row labels
          height={height + 20} // Add extra space for column labels
          viewBox={`0 0 ${width + 20} ${height + 20}`}
          xmlns="http://www.w3.org/2000/svg"
          className="border border-gray-200 rounded"
        >
          {/* Background grid */}
          <g className="grid-lines" opacity="0.1">
            {Array.from({ length: gridSize.rows + 1 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={padding + 20}
                y1={padding + i * cellSize + 20}
                x2={width - padding + 20}
                y2={padding + i * cellSize + 20}
                stroke="#000"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: gridSize.cols + 1 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={padding + i * cellSize + 20}
                y1={padding + 20}
                x2={padding + i * cellSize + 20}
                y2={height - padding + 20}
                stroke="#000"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Column headers */}
          {Array.from({ length: gridSize.cols }).map((_, i) => {
            // For each section, check if any seat in that section has inverted legend
            const hasInvertedLegend = Object.values(seatsBySection).some((inverted) => inverted)

            return (
              <text
                key={`col-${i}`}
                x={padding + i * (cellSize + gapSize) + cellSize / 2 + 20}
                y={padding / 2 + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10px"
                fill="#666"
              >
                {hasInvertedLegend ? i + 1 : getColumnLabel(i)}
              </text>
            )
          })}

          {/* Row headers */}
          {Array.from({ length: gridSize.rows }).map((_, i) => {
            // For each section, check if any seat in that section has inverted legend
            const hasInvertedLegend = Object.values(seatsBySection).some((inverted) => inverted)

            return (
              <text
                key={`row-${i}`}
                x={padding / 2 + 10}
                y={padding + i * (cellSize + gapSize) + cellSize / 2 + 20}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10px"
                fill="#666"
              >
                {hasInvertedLegend ? String.fromCharCode(65 + i) : i + 1}
              </text>
            )
          })}

          {/* Seats */}
          {Object.entries(seatMap).map(([key, seat]) => {
            const [row, col] = key.split("-").map(Number)
            const section = sections.find((s) => s.id === seat.section)
            const cx = padding + col * (cellSize + gapSize) + cellSize / 2 + 20
            const cy = padding + row * (cellSize + gapSize) + cellSize / 2 + 20

            // Determine grid position format based on section's legend orientation
            const isInverted = section?.legendTracking && section?.invertLegend
            const gridPosition = isInverted
              ? `${col + 1}${String.fromCharCode(65 + row)}`
              : `${String.fromCharCode(65 + row)}${col + 1}`

            return (
              <g key={key}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={cellSize / 2 - 2}
                  fill={section?.color || "#000"}
                  className="seat seat-zone"
                  id={seat.id || `seat-${row}-${col}`}
                  data-grid-position={gridPosition}
                />

                {showIds && seat.id && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="6px"
                    fontWeight="bold"
                  >
                    {seat.id.length <= 3 ? seat.id : ""}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        {sections.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                <span>{section.name}</span>
                <span className="text-muted-foreground">({sectionCounts[section.id] || 0})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

