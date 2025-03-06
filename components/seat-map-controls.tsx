"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Slider } from "@/components/ui/slider"

interface SeatMapControlsProps {
  gridSize: { rows: number; cols: number }
  gridGap: number
  onGridSizeChange: (size: { rows: number; cols: number }) => void
  onGridGapChange: (gap: number) => void
}

export function SeatMapControls({ gridSize, gridGap, onGridSizeChange, onGridGapChange }: SeatMapControlsProps) {
  const [tempRows, setTempRows] = useState(gridSize.rows.toString())
  const [tempCols, setTempCols] = useState(gridSize.cols.toString())

  const handleApply = () => {
    const rows = Number.parseInt(tempRows)
    const cols = Number.parseInt(tempCols)

    if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0) {
      onGridSizeChange({
        rows: Math.min(rows, 100), // Limit to reasonable size
        cols: Math.min(cols, 100),
      })
    }
  }

  const gapSizes = [0, 1, 2, 3, 4, 5, 6]

  return (
    <Card className="mt-4 p-4 border shadow !bg-base-100 border-base-300 rounded-md">
      <CardHeader>
        <CardTitle>Configuración del Mapa de Asientos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rows">Filas</Label>
              <Input
                id="rows"
                type="number"
                min="1"
                className="w-full btn text-left"
                max="100"
                value={tempRows}
                onChange={(e) => setTempRows(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cols">Columnas</Label>
              <Input
                id="cols"
                type="number"
                min="1"
                className="w-full btn text-left"
                max="100"
                value={tempCols}
                onChange={(e) => setTempCols(e.target.value)}
              />
            </div>
          </div>
          <Button variant={'outline'} className="btn w-full text-base-100 btn-neutral"  onClick={handleApply}>Aplicar</Button>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <Label htmlFor="gap">Espacios de celdas</Label>
              <span className="text-sm text-muted-foreground">{gridGap * 4}px</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ninguno</span>
              <Slider
                id="gap"
                min={0}
                max={6}
                step={1}
                value={[gridGap]}
                onValueChange={(value) => onGridGapChange(value[0])}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">Grande</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

