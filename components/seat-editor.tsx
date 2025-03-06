"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SeatEditorProps {
  seatKey: string
  seat: {
    id: string
    section: string
    customId?: boolean
    type: string
    notes?: string
    [key: string]: any
  }
  sections: Array<{
    id: string
    name: string
    color: string
  }>
  onUpdate: (data: any) => void
  onRemove: () => void
  onClose: () => void
}

export function SeatEditor({ seatKey, seat, sections, onUpdate, onRemove, onClose }: SeatEditorProps) {
  const [position] = useState(() => {
    const [row, col] = seatKey.split("-").map(Number)
    return { row: row + 1, col: col + 1 } // Convert to 1-based for display
  })

  const [seatData, setSeatData] = useState({
    id: seat.id || "",
    section: seat.section,
    notes: seat.notes || "",
  })

  const section = sections.find((s) => s.id === seatData.section)

  const handleSave = () => {
    onUpdate(seatData)
    onClose()
  }

  const handleChange = (field: string, value: any) => {
    setSeatData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center z-50 pt-20">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-sm">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Edit Seat</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Position and Section Info */}
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Position: Row {position.row}, Column {position.col}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: section?.color || "#000000" }} />
              <span>{section?.name}</span>
            </div>
          </div>

          {/* Seat ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Seat ID</label>
            <Input
              value={seatData.id}
              onChange={(e) => handleChange("id", e.target.value)}
              placeholder="Enter seat ID"
            />
          </div>

          {/* Section Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Section</label>
            <Select value={seatData.section} onValueChange={(value) => handleChange("section", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                      <span>{section.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Input
              value={seatData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add notes about this seat"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" className="flex-1" onClick={onRemove}>
              Remove
            </Button>
            <Button variant="default" className="flex-1" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 bg-black/20 -z-10" onClick={onClose} />
    </div>
  )
}

