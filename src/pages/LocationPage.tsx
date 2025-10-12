"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, ChevronDown, Building2, MapPin, Plus, Edit2, Trash2, X } from "lucide-react"
import type { Shelf, ShelfColumn, ShelfElement } from "@/features/shelves/types/shelf"
import { Link } from "react-router-dom"

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

type HierarchyNode = {
  building: string
  rooms: {
    room: string
    shelves: Shelf[]
  }[]
}

type EditingShelf = {
  id: string
  name: string
  building: string
  room: string
  columns: ShelfColumn[]
}

export default function LocationPage() {
  const [shelves, setShelves] = React.useState<Shelf[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const [expandedBuildings, setExpandedBuildings] = React.useState<Set<string>>(new Set())
  const [expandedRooms, setExpandedRooms] = React.useState<Set<string>>(new Set())
  const [expandedShelves, setExpandedShelves] = React.useState<Set<string>>(new Set())

  const [editingShelfId, setEditingShelfId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState<EditingShelf | null>(null)
  const [savingShelfId, setSavingShelfId] = React.useState<string | null>(null)
  const [deletingShelfId, setDeletingShelfId] = React.useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    name: "",
    building: "",
    room: ""
  })
  const [creating, setCreating] = React.useState(false)

  const fetchShelves = React.useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/shelves`)
      if (!response.ok) {
        throw new Error(`Failed to load shelves (HTTP ${response.status})`)
      }
      const data = await response.json()
      const parsed = Array.isArray(data) ? (data as Shelf[]) : []
      setShelves(parsed)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load shelves."
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchShelves()
  }, [fetchShelves])

  const hierarchy = React.useMemo<HierarchyNode[]>(() => {
    const buildingMap = new Map<string, Map<string, Shelf[]>>()

    for (const shelf of shelves) {
      const building = shelf.building || "Unknown Building"
      const room = shelf.room || "Unknown Room"

      if (!buildingMap.has(building)) {
        buildingMap.set(building, new Map())
      }

      const roomMap = buildingMap.get(building)!
      if (!roomMap.has(room)) {
        roomMap.set(room, [])
      }

      roomMap.get(room)!.push(shelf)
    }

    return Array.from(buildingMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([building, roomMap]) => ({
        building,
        rooms: Array.from(roomMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([room, shelves]) => ({
            room,
            shelves: shelves.sort((a, b) => a.name.localeCompare(b.name))
          }))
      }))
  }, [shelves])

  const toggleBuilding = (building: string) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev)
      if (next.has(building)) {
        next.delete(building)
      } else {
        next.add(building)
      }
      return next
    })
  }

  const toggleRoom = (building: string, room: string) => {
    const key = `${building}::${room}`
    setExpandedRooms(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleShelf = (shelfId: string) => {
    setExpandedShelves(prev => {
      const next = new Set(prev)
      if (next.has(shelfId)) {
        next.delete(shelfId)
      } else {
        next.add(shelfId)
      }
      return next
    })
  }

  const startEdit = (shelf: Shelf) => {
    setEditingShelfId(shelf.id)
    setEditForm({
      id: shelf.id,
      name: shelf.name,
      building: shelf.building,
      room: shelf.room,
      columns: shelf.columns
    })
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const cancelEdit = () => {
    setEditingShelfId(null)
    setEditForm(null)
  }

  const handleSaveShelf = async () => {
    if (!editForm) return

    if (!editForm.name.trim()) {
      setErrorMessage("Shelf name is required")
      return
    }

    if (!editForm.building.trim()) {
      setErrorMessage("Building is required")
      return
    }

    if (!editForm.room.trim()) {
      setErrorMessage("Room is required")
      return
    }

    setSavingShelfId(editForm.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`${API_BASE_URL}/shelves/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name.trim(),
          building: editForm.building.trim(),
          room: editForm.room.trim(),
          columns: editForm.columns
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update shelf (HTTP ${response.status})`)
      }

      await fetchShelves()
      setSuccessMessage("Shelf updated successfully")
      cancelEdit()

      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update shelf."
      setErrorMessage(message)
    } finally {
      setSavingShelfId(null)
    }
  }

  const handleDeleteShelf = async (shelfId: string, shelfName: string) => {
    if (!window.confirm(`Are you sure you want to delete shelf "${shelfName}"?`)) {
      return
    }

    setDeletingShelfId(shelfId)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`${API_BASE_URL}/shelves/${shelfId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete shelf (HTTP ${response.status})`)
      }

      await fetchShelves()
      setSuccessMessage("Shelf deleted successfully")

      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete shelf."
      setErrorMessage(message)
    } finally {
      setDeletingShelfId(null)
    }
  }

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createForm.name.trim()) {
      setErrorMessage("Shelf name is required")
      return
    }

    if (!createForm.building.trim()) {
      setErrorMessage("Building is required")
      return
    }

    if (!createForm.room.trim()) {
      setErrorMessage("Room is required")
      return
    }

    setCreating(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const newShelf = {
        id: `shelf-${Date.now()}`,
        name: createForm.name.trim(),
        building: createForm.building.trim(),
        room: createForm.room.trim(),
        columns: []
      }

      const response = await fetch(`${API_BASE_URL}/shelves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newShelf),
      })

      if (!response.ok) {
        throw new Error(`Failed to create shelf (HTTP ${response.status})`)
      }

      await fetchShelves()
      setSuccessMessage("Shelf created successfully")
      setCreateForm({ name: "", building: "", room: "" })
      setShowCreateForm(false)

      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create shelf."
      setErrorMessage(message)
    } finally {
      setCreating(false)
    }
  }

  const handleAddColumn = (shelfId: string) => {
    if (!editForm || editForm.id !== shelfId) return

    const newColumn: ShelfColumn = {
      id: `col-${Date.now()}`,
      elements: []
    }

    setEditForm({
      ...editForm,
      columns: [...editForm.columns, newColumn]
    })
  }

  const handleRemoveColumn = (shelfId: string, columnIndex: number) => {
    if (!editForm || editForm.id !== shelfId) return

    setEditForm({
      ...editForm,
      columns: editForm.columns.filter((_, idx) => idx !== columnIndex)
    })
  }

  const handleAddElement = (shelfId: string, columnIndex: number) => {
    if (!editForm || editForm.id !== shelfId) return

    const newElement: ShelfElement = {
      id: `unit-${Date.now()}`,
      type: "slim"
    }

    const updatedColumns = [...editForm.columns]
    updatedColumns[columnIndex] = {
      ...updatedColumns[columnIndex],
      elements: [...updatedColumns[columnIndex].elements, newElement]
    }

    setEditForm({
      ...editForm,
      columns: updatedColumns
    })
  }

  const handleRemoveElement = (shelfId: string, columnIndex: number, elementIndex: number) => {
    if (!editForm || editForm.id !== shelfId) return

    const updatedColumns = [...editForm.columns]
    updatedColumns[columnIndex] = {
      ...updatedColumns[columnIndex],
      elements: updatedColumns[columnIndex].elements.filter((_, idx) => idx !== elementIndex)
    }

    setEditForm({
      ...editForm,
      columns: updatedColumns
    })
  }

  const handleUpdateElementType = (shelfId: string, columnIndex: number, elementIndex: number, newType: "slim" | "high") => {
    if (!editForm || editForm.id !== shelfId) return

    const updatedColumns = [...editForm.columns]
    updatedColumns[columnIndex].elements[elementIndex] = {
      ...updatedColumns[columnIndex].elements[elementIndex],
      type: newType
    }

    setEditForm({
      ...editForm,
      columns: updatedColumns
    })
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-10">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Manage your inventory locations organized by building, room, shelf, and shelf unit.
          </p>
        </div>
        <Link to="/shelf-builder" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 has-[>svg]:px-3">
          <Plus className="h-4 w-4" />
          Add Shelf
        </Link>
      </header>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">
          {successMessage}
        </div>
      ) : null}

      {showCreateForm && (
        <form onSubmit={handleCreateShelf} className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create New Shelf</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shelf Name *</label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Main Storage Rack"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Building *</label>
              <Input
                value={createForm.building}
                onChange={(e) => setCreateForm({ ...createForm, building: e.target.value })}
                placeholder="e.g. CAB"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Room *</label>
              <Input
                value={createForm.room}
                onChange={(e) => setCreateForm({ ...createForm, room: e.target.value })}
                placeholder="e.g. E 33.1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Shelf"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-lg border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
          Loading locations...
        </div>
      ) : hierarchy.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
          No locations found. Create your first shelf to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {hierarchy.map((buildingNode) => {
            const isBuildingExpanded = expandedBuildings.has(buildingNode.building)
            const totalRooms = buildingNode.rooms.length
            const totalShelves = buildingNode.rooms.reduce((sum, room) => sum + room.shelves.length, 0)

            return (
              <div
                key={buildingNode.building}
                className="overflow-hidden rounded-lg border bg-card shadow-sm"
              >
                <button
                  onClick={() => toggleBuilding(buildingNode.building)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{buildingNode.building}</h2>
                      <p className="text-sm text-muted-foreground">
                        {totalRooms} {totalRooms === 1 ? "room" : "rooms"} · {totalShelves} {totalShelves === 1 ? "shelf" : "shelves"}
                      </p>
                    </div>
                  </div>
                  {isBuildingExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isBuildingExpanded && (
                  <div className="border-t bg-muted/20">
                    {buildingNode.rooms.map((roomNode) => {
                      const roomKey = `${buildingNode.building}::${roomNode.room}`
                      const isRoomExpanded = expandedRooms.has(roomKey)

                      return (
                        <div key={roomKey} className="border-b last:border-b-0">
                          <button
                            onClick={() => toggleRoom(buildingNode.building, roomNode.room)}
                            className="flex w-full items-center justify-between px-6 py-3 pl-14 text-left transition-colors hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div>
                                <h3 className="font-medium">{roomNode.room}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {roomNode.shelves.length} {roomNode.shelves.length === 1 ? "shelf" : "shelves"}
                                </p>
                              </div>
                            </div>
                            {isRoomExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>

                          {isRoomExpanded && (
                            <div className="bg-background/50 px-6 py-2 pl-20">
                              {roomNode.shelves.map((shelf) => {
                                const isShelfExpanded = expandedShelves.has(shelf.id)
                                const isEditing = editingShelfId === shelf.id
                                const totalUnits = shelf.columns.reduce((sum, col) => sum + col.elements.length, 0)

                                return (
                                  <div key={shelf.id} className="mb-3 rounded-md border bg-card">
                                    {isEditing && editForm ? (
                                      <div className="p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold">Edit Shelf</h4>
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={handleSaveShelf}
                                              disabled={savingShelfId === shelf.id}
                                            >
                                              {savingShelfId === shelf.id ? "Saving..." : "Save"}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={cancelEdit}
                                              disabled={savingShelfId === shelf.id}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-3">
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Shelf Name</label>
                                            <Input
                                              value={editForm.name}
                                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Building</label>
                                            <Input
                                              value={editForm.building}
                                              onChange={(e) => setEditForm({ ...editForm, building: e.target.value })}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Room</label>
                                            <Input
                                              value={editForm.room}
                                              onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <h5 className="text-sm font-medium">Columns & Units</h5>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleAddColumn(shelf.id)}
                                              className="gap-1"
                                            >
                                              <Plus className="h-3 w-3" />
                                              Add Column
                                            </Button>
                                          </div>

                                          {editForm.columns.map((column, columnIndex) => (
                                            <div key={column.id} className="rounded border bg-muted/30 p-3 space-y-2">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Column {columnIndex + 1}</span>
                                                <div className="flex gap-2">
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleAddElement(shelf.id, columnIndex)}
                                                    className="h-7 gap-1 text-xs"
                                                  >
                                                    <Plus className="h-3 w-3" />
                                                    Add Unit
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveColumn(shelf.id, columnIndex)}
                                                    className="h-7 text-xs text-destructive hover:text-destructive"
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              </div>

                                              {column.elements.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No units</p>
                                              ) : (
                                                <div className="space-y-1">
                                                  {column.elements.map((element, elementIndex) => (
                                                    <div key={element.id} className="flex items-center gap-2 text-sm">
                                                      <span className="font-mono text-xs text-muted-foreground min-w-[60px]">
                                                        Unit {elementIndex + 1}:
                                                      </span>
                                                      <Input
                                                        value={element.id}
                                                        readOnly
                                                        className="h-8 flex-1 text-xs"
                                                      />
                                                      <select
                                                        value={element.type}
                                                        onChange={(e) => handleUpdateElementType(shelf.id, columnIndex, elementIndex, e.target.value as "slim" | "high")}
                                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                                      >
                                                        <option value="slim">Slim</option>
                                                        <option value="high">High</option>
                                                      </select>
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveElement(shelf.id, columnIndex, elementIndex)}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => toggleShelf(shelf.id)}
                                          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
                                        >
                                          <div>
                                            <h4 className="font-medium">{shelf.name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                              {shelf.columns.length} {shelf.columns.length === 1 ? "column" : "columns"} · {totalUnits} {totalUnits === 1 ? "unit" : "units"}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                startEdit(shelf)
                                              }}
                                              disabled={deletingShelfId === shelf.id}
                                              className="gap-1"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                              Edit
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteShelf(shelf.id, shelf.name)
                                              }}
                                              disabled={deletingShelfId === shelf.id}
                                              className="gap-1 text-destructive hover:text-destructive"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                              {deletingShelfId === shelf.id ? "Deleting..." : "Delete"}
                                            </Button>
                                            {isShelfExpanded ? (
                                              <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
                                            )}
                                          </div>
                                        </button>

                                        {isShelfExpanded && (
                                          <div className="border-t bg-muted/10 px-4 py-3">
                                            <div className="space-y-3">
                                              {shelf.columns.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No columns yet. Click "Edit" to add columns and units.</p>
                                              ) : (
                                                shelf.columns.map((column, columnIndex) => (
                                                  <div key={column.id} className="rounded border bg-background p-3">
                                                    <h5 className="mb-2 text-sm font-medium text-muted-foreground">
                                                      Column {columnIndex + 1}
                                                    </h5>
                                                    {column.elements.length === 0 ? (
                                                      <p className="text-sm text-muted-foreground">No shelf units</p>
                                                    ) : (
                                                      <ul className="space-y-1">
                                                        {column.elements.map((element, elementIndex) => (
                                                          <li
                                                            key={element.id}
                                                            className="text-sm"
                                                          >
                                                            <span className="font-mono text-muted-foreground">
                                                              Unit {elementIndex + 1}:
                                                            </span>{" "}
                                                            <span className="font-medium">{element.id}</span>
                                                            <span className="text-muted-foreground"> ({element.type})</span>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    )}
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
