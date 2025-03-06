"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Import } from "lucide-react"
import * as XLSX from "xlsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface SeatMapImportProps {
  onImport: (data: { seatMap: Record<string, any>; gridSize: { rows: number; cols: number } }) => void
  activeSection: string
  sections: Array<{ id: string; name: string; color: string }>
}

export function SeatMapImport({ onImport, activeSection, sections }: SeatMapImportProps) {
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedSection, setSelectedSection] = useState(activeSection)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      // Convert to array of arrays
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      // Filter out empty rows and validate data
      const validRows = jsonData.filter((row) => row.some((cell) => cell !== undefined))

      if (validRows.length === 0) {
        throw new Error("No data found in the spreadsheet")
      }

      // Find the maximum row and column indices
      const numRows = validRows.length
      const numCols = Math.max(...validRows.map((row) => row.length))

      // Create seat map from the data
      const seatMap: Record<string, any> = {}

      validRows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          // Convert cell value to number or use 0
          const value = Number(cell) || 0

          // If cell value is 1, add a seat
          if (value === 1) {
            seatMap[`${rowIndex}-${colIndex}`] = {
              section: selectedSection,
              type: "seat",
            }
          }
        })
      })

      // Import the data
      onImport({
        seatMap,
        gridSize: {
          rows: numRows,
          cols: numCols,
        },
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      console.error(err)
      setError("Failed to import Excel file. Please make sure it contains valid data.")
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="mt-4 p-4 border shadow !bg-base-100 border-base-300 rounded-md">
      <CardHeader>
        <CardTitle>Importar Mapa de Asientos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="section-select">Asignar asientos a sección</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger id="section-select">
                  <SelectValue>{sections.find((s) => s.id === selectedSection)?.name || "Seleccionar sección"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                        {section.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
      

          <Button variant={'outline'} onClick={handleClick} className="btn w-full text-base-100 btn-neutral">
            <Import className="h-4 w-4 mr-2" />
            Cargar excel (1/0 Layout)
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="text-xs text-muted-foreground">
          Sube un archivo Excel con 1 y 0 para definir la disposición de los asientos. 1 = asiento, 0 = espacio vacío.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

