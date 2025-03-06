"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Edit, Trash2, Search, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface SeatListProps {
  seatMap: Record<string, any>
  sections: Array<{
    id: string
    name: string
    color: string
  }>
  onSeatSelect: (key: string) => void
  onSeatUpdate: (key: string, data: any) => void
  onSeatRemove: (key: string) => void
}

export function SeatList({ seatMap, sections, onSeatSelect, onSeatUpdate, onSeatRemove }: SeatListProps) {
  const [search, setSearch] = useState("")
  const [sectionFilter, setSectionFilter] = useState("all")
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  // Transform seatMap into an array for filtering and sorting
  const seats = useMemo(() => {
    return Object.entries(seatMap).map(([key, seat]) => {
      const [row, col] = key.split("-").map(Number)
      const section = sections.find((s) => s.id === seat.section)
      return {
        key,
        id: seat.id || "",
        sectionId: seat.section,
        sectionName: section?.name || "Unknown",
        sectionColor: section?.color || "#000000",
        row: row + 1, // 1-based for display
        col: col + 1, // 1-based for display
        notes: seat.notes || "",
        customId: seat.customId || false,
      }
    })
  }, [seatMap, sections])

  // Apply filters
  const filteredSeats = useMemo(() => {
    return seats.filter((seat) => {
      // Section filter
      if (sectionFilter !== "all" && seat.sectionId !== sectionFilter) {
        return false
      }

      // Search filter (case-insensitive)
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          seat.id.toLowerCase().includes(searchLower) ||
          seat.sectionName.toLowerCase().includes(searchLower) ||
          seat.notes.toLowerCase().includes(searchLower) ||
          `Row ${seat.row}, Col ${seat.col}`.toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }, [seats, search, sectionFilter])

  // Sort seats by section, then row, then column
  const sortedSeats = useMemo(() => {
    return [...filteredSeats].sort((a, b) => {
      // First by section name
      if (a.sectionName !== b.sectionName) {
        return a.sectionName.localeCompare(b.sectionName)
      }
      // Then by row
      if (a.row !== b.row) {
        return a.row - b.row
      }
      // Then by column
      return a.col - b.col
    })
  }, [filteredSeats])

  const handleStartEdit = (key: string, currentId: string) => {
    setEditingKey(key)
    setEditValue(currentId)
  }

  const handleSaveEdit = () => {
    if (editingKey && editValue.trim()) {
      onSeatUpdate(editingKey, { id: editValue, customId: true })
      setEditingKey(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingKey(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="search-seats" className="sr-only">
            Buscar asientos
          </Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-seats"
              placeholder="Buscar por ID, sección o posición..."
           
              className="pl-8 w-full btn text-left"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <Label htmlFor="section-filter" className="sr-only">
            Filtrar por Sección
          </Label>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger id="section-filter" className="w-full">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="All Sections" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <div className="rounded-md border border-base-300 bg-base-100">
          <Table className="table border-base-300">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead>Grid</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSeats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    {search || sectionFilter !== "all"
                      ? "No asientos coinciden con tus filtros"
                      : "No asientos creados aún. Agrega asientos en el editor."}
                  </TableCell>
                </TableRow>
              ) : (
                sortedSeats.map((seat) => {
                  // Calculate grid position (a1, b2, etc.)
                  const gridCol = String.fromCharCode(97 + seat.col - 1) // Convert to a, b, c, etc.
                  const gridRow = seat.row
                  const gridPosition = `${gridCol}${gridRow}`

                  return (
                    <TableRow key={seat.key}>
                      <TableCell>
                        {editingKey === seat.key ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 w-24"
                            />
                            <Button size="sm" variant="outline" onClick={handleSaveEdit} className="h-8 px-2 btn btn-neutral">
                              Guardar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 px-2">
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{seat.id || "—"}</span>
                            {seat.customId && <span className="text-xs text-amber-500 italic">(custom)</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seat.sectionColor }} />
                          <span>{seat.sectionName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        Row {seat.row}, Col {seat.col}
                      </TableCell>
                      <TableCell>{gridPosition}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {editingKey !== seat.key && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(seat.key, seat.id)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSeatSelect(seat.key)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSeatRemove(seat.key)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <div className="p-2 border-t border-base-200 flex justify-between items-center text-sm text-muted-foreground">
            <span>Total: {sortedSeats.length} seats</span>
            {sortedSeats.length !== seats.length && <span>(Filtered from {seats.length} total)</span>}
          </div>
        </div>
      </Card>
    </div>
  )
}

