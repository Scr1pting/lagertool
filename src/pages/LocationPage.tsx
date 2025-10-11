"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

type LocationRecord = {
  id: number
  campus?: string | null
  building?: string | null
  room?: string | null
  shelf?: string | null
  shelfunit?: string | null
}

type FormState = {
  campus: string
  building: string
  room: string
  shelf: string
  shelfunit: string
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const emptyForm: FormState = {
  campus: "",
  building: "",
  room: "",
  shelf: "",
  shelfunit: "",
}

const summarizeLocation = (location: LocationRecord) => {
  const parts = [
    location.campus,
    location.building,
    location.room,
    [location.shelf, location.shelfunit].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" · ")

  return parts || `Location ${location.id}`
}

export default function LocationPage() {
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [locations, setLocations] = React.useState<LocationRecord[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [submitLoading, setSubmitLoading] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = React.useState<number | null>(null)
  const [editBuffer, setEditBuffer] = React.useState<FormState | null>(null)

  const fetchLocations = React.useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/locations`)
      if (!response.ok) {
        throw new Error(`Failed to load locations (HTTP ${response.status})`)
      }
      const data = await response.json()
      const parsed = Array.isArray(data) ? (data as LocationRecord[]) : []
      setLocations(parsed)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load locations."
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    target?: "form" | "edit"
  ) => {
    const { name, value } = event.target
    if (target === "edit") {
      setEditBuffer((prev) =>
        prev ? { ...prev, [name]: value } : prev
      )
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const resetForm = () => {
    setForm(emptyForm)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!form.campus.trim()) {
      setErrorMessage("Campus is required.")
      return
    }

    if (!form.building.trim()) {
      setErrorMessage("Building is required.")
      return
    }

    setSubmitLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campus: form.campus.trim(),
          building: form.building.trim(),
          room: form.room.trim() || undefined,
          shelf: form.shelf.trim() || undefined,
          shelfunit: form.shelfunit.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create location (HTTP ${response.status})`)
      }

      await fetchLocations()
      resetForm()
      setSuccessMessage("Location created successfully.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create location."
      setErrorMessage(message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const startEditLocation = (location: LocationRecord) => {
    setSelectedLocationId(location.id)
    setEditBuffer({
      campus: location.campus ?? "",
      building: location.building ?? "",
      room: location.room ?? "",
      shelf: location.shelf ?? "",
      shelfunit: location.shelfunit ?? "",
    })
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const cancelEdit = () => {
    setSelectedLocationId(null)
    setEditBuffer(null)
  }

  const handleUpdateLocation = async (locationId: number) => {
    if (!editBuffer) {
      return
    }

    if (!editBuffer.campus.trim()) {
      setErrorMessage("Campus is required.")
      return
    }

    if (!editBuffer.building.trim()) {
      setErrorMessage("Building is required.")
      return
    }

    setRowState(locationId, "updating")

    try {
      const response = await fetch(`${API_BASE_URL}/locations/${locationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campus: editBuffer.campus.trim(),
          building: editBuffer.building.trim(),
          room: editBuffer.room.trim() || undefined,
          shelf: editBuffer.shelf.trim() || undefined,
          shelfunit: editBuffer.shelfunit.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update location (HTTP ${response.status})`)
      }

      await fetchLocations()
      setSuccessMessage("Location updated.")
      cancelEdit()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update location."
      setErrorMessage(message)
    } finally {
      clearRowState(locationId)
    }
  }

  const handleDeleteLocation = async (locationId: number) => {
    setRowState(locationId, "deleting")
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`${API_BASE_URL}/locations/${locationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete location (HTTP ${response.status})`)
      }

      setLocations((prev) => prev.filter((location) => location.id !== locationId))
      setSuccessMessage("Location removed.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete location."
      setErrorMessage(message)
    } finally {
      clearRowState(locationId)
    }
  }

  const [rowStates, setRowStates] = React.useState<
    Record<number, "updating" | "deleting">
  >({})

  const setRowState = (id: number, state: "updating" | "deleting") => {
    setRowStates((prev) => ({ ...prev, [id]: state }))
  }

  const clearRowState = (id: number) => {
    setRowStates((prev) => {
      const { [id]: _ignored, ...rest } = prev
      return rest
    })
  }

  const getRowState = (id: number) => rowStates[id]

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Locations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add and manage storage locations using the Lagertool API specification.
        </p>
      </header>

      <form
        className="space-y-6 rounded-lg border bg-card px-6 py-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="campus"
            >
              Campus *
            </label>
            <input
              id="campus"
              name="campus"
              value={form.campus}
              onChange={handleFieldChange}
              placeholder="e.g. Hönggerberg"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="building"
            >
              Building *
            </label>
            <input
              id="building"
              name="building"
              value={form.building}
              onChange={handleFieldChange}
              placeholder="e.g. CAB"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="room"
            >
              Room
            </label>
            <input
              id="room"
              name="room"
              value={form.room}
              onChange={handleFieldChange}
              placeholder="e.g. E 33.1"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="shelf"
            >
              Shelf
            </label>
            <input
              id="shelf"
              name="shelf"
              value={form.shelf}
              onChange={handleFieldChange}
              placeholder="e.g. Rack 4"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="shelfunit"
            >
              Shelf unit
            </label>
            <input
              id="shelfunit"
              name="shelfunit"
              value={form.shelfunit}
              onChange={handleFieldChange}
              placeholder="e.g. Level 2"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600">
            {successMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={submitLoading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={submitLoading}>
            {submitLoading ? "Saving…" : "Add location"}
          </Button>
        </div>
      </form>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-medium">Existing locations</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {loading ? <span>Loading…</span> : null}
            <Button variant="secondary" size="sm" onClick={fetchLocations}>
              Refresh
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Summary</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {locations.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                  >
                    No locations yet.
                  </td>
                </tr>
              ) : (
                locations.map((location) => {
                  const rowState = getRowState(location.id)
                  const isEditing = selectedLocationId === location.id
                  const buffer = isEditing && editBuffer ? editBuffer : null

                  return (
                    <tr key={location.id} className="text-sm">
                      <td className="px-6 py-4 font-mono">#{location.id}</td>
                      <td className="px-6 py-4">{summarizeLocation(location)}</td>
                      <td className="px-6 py-4">
                        {isEditing && buffer ? (
                          <div className="grid gap-2 md:grid-cols-2">
                            <input
                              name="campus"
                              value={buffer.campus}
                              onChange={(event) =>
                                handleFieldChange(event, "edit")
                              }
                              placeholder="Campus"
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            />
                            <input
                              name="building"
                              value={buffer.building}
                              onChange={(event) =>
                                handleFieldChange(event, "edit")
                              }
                              placeholder="Building"
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            />
                            <input
                              name="room"
                              value={buffer.room}
                              onChange={(event) =>
                                handleFieldChange(event, "edit")
                              }
                              placeholder="Room"
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            />
                            <input
                              name="shelf"
                              value={buffer.shelf}
                              onChange={(event) =>
                                handleFieldChange(event, "edit")
                              }
                              placeholder="Shelf"
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            />
                            <input
                              name="shelfunit"
                              value={buffer.shelfunit}
                              onChange={(event) =>
                                handleFieldChange(event, "edit")
                              }
                              placeholder="Shelf unit"
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm md:col-span-2"
                            />
                          </div>
                        ) : (
                          <dl className="grid gap-1 text-xs text-muted-foreground">
                            <div className="flex gap-2">
                              <dt className="font-medium text-foreground">
                                Campus:
                              </dt>
                              <dd>{location.campus || "—"}</dd>
                            </div>
                            <div className="flex gap-2">
                              <dt className="font-medium text-foreground">
                                Building:
                              </dt>
                              <dd>{location.building || "—"}</dd>
                            </div>
                            <div className="flex gap-2">
                              <dt className="font-medium text-foreground">
                                Room:
                              </dt>
                              <dd>{location.room || "—"}</dd>
                            </div>
                            <div className="flex gap-2">
                              <dt className="font-medium text-foreground">
                                Shelf:
                              </dt>
                              <dd>{location.shelf || "—"}</dd>
                            </div>
                            <div className="flex gap-2">
                              <dt className="font-medium text-foreground">
                                Shelf unit:
                              </dt>
                              <dd>{location.shelfunit || "—"}</dd>
                            </div>
                          </dl>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isEditing && buffer ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleUpdateLocation(location.id)}
                                disabled={rowState === "updating"}
                              >
                                {rowState === "updating" ? "Saving…" : "Save"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={rowState === "updating"}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditLocation(location)}
                                disabled={rowState === "deleting"}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteLocation(location.id)}
                                disabled={rowState === "deleting"}
                              >
                                {rowState === "deleting" ? "Removing…" : "Delete"}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
