"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Edit, ChevronDown, ChevronUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface SectionManagerProps {
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
  activeSection: string
  onSectionSelect: (id: string) => void
  onSectionUpdate: (id: string, data: any, applyMode?: "all" | "new") => void
  onSectionAdd: (section: any) => void
  onSectionRemove: (id: string) => void
}

export function SectionManager({
  sections,
  activeSection,
  onSectionSelect,
  onSectionUpdate,
  onSectionAdd,
  onSectionRemove,
}: SectionManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newSection, setNewSection] = useState({
    name: "",
    color: "#000000",
    idPrefix: "A",
    idStartNumber: 1,
    autoId: true,
    legendTracking: false,
    invertLegend: false,
  })
  const [editSection, setEditSection] = useState({
    name: "",
    color: "",
    idPrefix: "",
    idStartNumber: 1,
    autoId: true,
    legendTracking: false,
    invertLegend: false,
  })
  // Add a new state for the apply mode
  const [applyMode, setApplyMode] = useState<"all" | "new">("new")
  // Add this after the editSection state declaration
  const [editApplyMode, setEditApplyMode] = useState<"all" | "new">("new")

  const handleAddSubmit = () => {
    if (newSection.name.trim()) {
      onSectionAdd(newSection)
      setNewSection({
        name: "",
        color: "#000000",
        idPrefix: "A",
        idStartNumber: 1,
        autoId: true,
        legendTracking: false,
        invertLegend: false,
      })
      setIsAdding(false)
    }
  }

  const handleEditSubmit = () => {
    if (editingId && editSection.name.trim()) {
      onSectionUpdate(editingId, editSection, editApplyMode)
      setEditingId(null)
    }
  }

  const startEditing = (section: any) => {
    setEditingId(section.id)
    setEditSection({
      name: section.name,
      color: section.color,
      idPrefix: section.idPrefix || "",
      idStartNumber: section.idStartNumber || 1,
      autoId: section.autoId !== undefined ? section.autoId : true,
      legendTracking: section.legendTracking !== undefined ? section.legendTracking : false,
      invertLegend: section.invertLegend !== undefined ? section.invertLegend : false,
    })
    setEditApplyMode("new") // Reset to default
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <Card className="mt-4 p-4 border shadow !bg-base-100 border-base-300 rounded-md">
      <CardHeader>
        <CardTitle>Secciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`border rounded-md overflow-hidden ${
                  activeSection === section.id ? "border-primary" : "border-base-300"
                }`}
              >
                {editingId === section.id ? (
                  <div className="p-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-name-${section.id}`}>Nombre</Label>
                      <Input
                        id={`edit-name-${section.id}`}
                        className="w-full input input-bordered"
                        value={editSection.name}
                        onChange={(e) => setEditSection({ ...editSection, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`edit-color-${section.id}`}>Color</Label>
                      <Input
                        id={`edit-color-${section.id}`}
                        type="color"
                        className="w-full input input-bordered"
                        value={editSection.color}
                        onChange={(e) => setEditSection({ ...editSection, color: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`edit-auto-id-${section.id}`}>Auto-Generar IDs</Label> 
                      <Switch
                        id={`edit-auto-id-${section.id}`}
                        checked={editSection.autoId}
                        onCheckedChange={(checked) => setEditSection({ ...editSection, autoId: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`edit-legend-tracking-${section.id}`}>Trackear Leyenda</Label> 
                      <Switch
                        id={`edit-legend-tracking-${section.id}`}
                        checked={editSection.legendTracking}
                        onCheckedChange={(checked) => setEditSection({ ...editSection, legendTracking: checked })}
                      />
                    </div>

                    {editSection.legendTracking && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`edit-invert-legend-${section.id}`}>Invertir leyenda</Label>
                          <Switch
                            id={`edit-invert-legend-${section.id}`}
                            checked={editSection.invertLegend}
                            onCheckedChange={(checked) => setEditSection({ ...editSection, invertLegend: checked })}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                          {editSection.invertLegend
                            ? "Uses format 3A (numbers on top, letters on left)"
                            : "Uses format A3 (letters on top, numbers on left)"}
                        </div>
                      </>
                    )}

                    {editSection.legendTracking && (
                      <div className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                        Uses grid position (e.g., D3) as the seat ID
                      </div>
                    )}

                    {editSection.autoId && !editSection.legendTracking && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-prefix-${section.id}`}>Prefijo ID (Letra/Texto)</Label>
                          <Input
                            id={`edit-prefix-${section.id}`}
                            value={editSection.idPrefix}
                            className="w-full input input-bordered"
                            onChange={(e) => setEditSection({ ...editSection, idPrefix: e.target.value })}
                            placeholder="e.g. G, SEC, ROW-A"
                          />
                          <p className="text-xs text-muted-foreground">
                            Este texto se agregar antes del número (e.g., "G" para G1, G2, G3...)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`edit-start-${section.id}`}>Empezar contando desde</Label>
                          <Input
                            id={`edit-start-${section.id}`}
                            type="number"
                            className="w-full input input-bordered"
                            min="0"
                            value={editSection.idStartNumber}
                            onChange={(e) =>
                              setEditSection({
                                ...editSection,
                                idStartNumber: Number.parseInt(e.target.value) || 1,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            El primer asiento se numerará desde este valor (e.g., 1 para G1, 101 para G101...)
                          </p>
                        </div>

                        <div className="space-y-2 mt-2">
                          <Label>Aplicar cambios de ID a:</Label>
                          <div className="flex items-center space-x-4 mt-1">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`apply-mode-${section.id}`}
                                checked={editApplyMode === "new"}
                                onChange={() => setEditApplyMode("new")}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">Nuevos asientos (preservar existentes)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`apply-mode-${section.id}`}
                                checked={editApplyMode === "all"}
                                onChange={() => setEditApplyMode("all")}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">Todos los asientos (reemplazar existentes)</span>
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Elija si actualizar IDs para todos los asientos existentes o solo para nuevos asientos.
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="" size="sm" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="outline" className=" btn btn-neutral" onClick={handleEditSubmit}>
                        Añadir
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center p-3 ${
                        activeSection === section.id ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: section.color }} />
                      <span className="flex-1 cursor-pointer" onClick={() => onSectionSelect(section.id)}>
                        {section.name}
                      </span>

                      <Button size="icon" variant="ghost" onClick={() => toggleExpand(section.id)}>
                        {expandedId === section.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>

                      <Button size="icon" variant="ghost" onClick={() => startEditing(section)}>
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onSectionRemove(section.id)}
                        disabled={sections.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {expandedId === section.id && (
                      <div className="p-3 pt-0 border-t text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Auto ID:</span>
                            <span className="ml-1">{section.autoId ? "Yes" : "No"}</span>
                          </div>

                          <div>
                            <span className="text-muted-foreground">Legend tracking:</span>
                            <span className="ml-1">{section.legendTracking ? "Yes" : "No"}</span>
                          </div>

                          {section.legendTracking && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Invert legend:</span>
                                <span className="ml-1">{section.invertLegend ? "Yes" : "No"}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Example:</span>
                                <span className="ml-1 font-medium">
                                  {section.invertLegend ? "1A, 2B, 3C..." : "A1, B2, C3..."}
                                </span>
                              </div>
                            </>
                          )}

                          {section.autoId && !section.legendTracking && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Prefix:</span>
                                <span className="ml-1 font-medium">{section.idPrefix || "None"}</span>
                              </div>

                              <div>
                                <span className="text-muted-foreground">Start Number:</span>
                                <span className="ml-1 font-medium">{section.idStartNumber || 1}</span>
                              </div>

                              <div>
                                <span className="text-muted-foreground">Example:</span>
                                <span className="ml-1 font-medium">
                                  {section.idPrefix}
                                  {section.idStartNumber}
                                </span>
                                <span className="ml-1 text-muted-foreground">→</span>
                                <span className="ml-1 font-medium">
                                  {section.idPrefix}
                                  {section.idStartNumber + 1}
                                </span>
                                <span className="ml-1 text-muted-foreground">→</span>
                                <span className="ml-1 font-medium">
                                  {section.idPrefix}
                                  {section.idStartNumber + 2}
                                </span>
                                <span className="ml-1 text-muted-foreground">...</span>
                              </div>
                            </>
                          )}

                          {section.legendTracking && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Example:</span>
                              <span className="ml-1 font-medium">A1, B2, C3, D4...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {isAdding ? (
            <div className="space-y-3 p-3 border border-base-300 rounded-md">
              <div className="space-y-2">
                <Label htmlFor="new-section-name">Nombre de sección</Label>
                <Input
                  id="new-section-name"
                  className="input input-bordered w-full"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  placeholder="Introduce un nombre de sección"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-section-color">Color</Label>
                <Input
                  id="new-section-color"
                  type="color"
                  className="input input-bordered w-full"
                  value={newSection.color}
                  onChange={(e) => setNewSection({ ...newSection, color: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="new-auto-id">Auto-generate IDs</Label>
                <Switch
                  id="new-auto-id"
                  className="toggle toggle-sm toggle-primary"
                  checked={newSection.autoId}
                  onCheckedChange={(checked) => setNewSection({ ...newSection, autoId: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="new-legend-tracking">Leyenda tracking</Label>
                <Switch
                  id="new-legend-tracking"
                  checked={newSection.legendTracking}
                  onCheckedChange={(checked) => setNewSection({ ...newSection, legendTracking: checked })}
                />
              </div>

              {newSection.legendTracking && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-invert-legend">Invertir leyenda</Label>
                    <Switch
                      id="new-invert-legend"
                      checked={newSection.invertLegend}
                      onCheckedChange={(checked) => setNewSection({ ...newSection, invertLegend: checked })}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                    {newSection.invertLegend
                      ? "Usa el formato 3A (numeros en el top, letras en el left)"
                      : "Usa el formato A3 (letras en el top, numeros en el left)"}
                  </div>
                </>
              )}

              {newSection.legendTracking && (
                <div className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                  Usa la posición de la grilla (e.g., D3) como ID de la plaza
                </div>
              )}

              {newSection.autoId && !newSection.legendTracking && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-id-prefix">ID Prefix (Letter/Text)</Label>
                    <Input
                      id="new-id-prefix"
                      value={newSection.idPrefix}
                      onChange={(e) => setNewSection({ ...newSection, idPrefix: e.target.value })}
                      placeholder="e.g. G, SEC, ROW-A"
                    />
                    <p className="text-xs text-muted-foreground">
                      This text will be added before the number (e.g., "G" for G1, G2, G3...)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-id-start">Start Counting From</Label>
                    <Input
                      id="new-id-start"
                      type="number"
                      min="0"
                      value={newSection.idStartNumber}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          idStartNumber: Number.parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      The first seat will be numbered from this value (e.g., 1 for G1, 101 for G101...)
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" className="" size="sm" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button size="sm" variant="outline" className="btn btn-neutral" onClick={handleAddSubmit}>
                  Añadir
                </Button>
              </div>
            </div>
          ) : (

            <Button variant="outline" size="sm" className="btn w-full text-base-100 btn-neutral" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir sección
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

