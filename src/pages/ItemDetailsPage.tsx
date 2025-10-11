"use client"

import * as React from "react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  normalizePerson,
  personDisplayName,
  type NormalizedPerson,
} from "@/lib/person"
import fetchShelfUnitDetail from "@/api/getShelfUnit"
import { type ShelfUnitDetail } from "@/api/types"

type ItemRecord = {
  id: number
  name: string
  category?: string | null
}

type InventoryRecord = {
  id: number
  item_id: number
  location_id: number
  amount: number
  note?: string | null
}

type LocationRecord = {
  id: number
  shelfUnitId: string | null
}

type LoanHistoryEntry = {
  id: number
  item_id: number
  person_id: number
  amount: number
  begin: string
  until: string
  returned?: boolean | null
  returned_at?: string | null
}

type ItemFormState = {
  name: string
  category: string
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date)
}

const normalizeLocationId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const normalizeShelfUnitId = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null
    }
    return trimmed.slice(0, 5).toUpperCase()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const truncated = Math.trunc(value)
    return truncated.toString().slice(0, 5).toUpperCase()
  }

  return null
}

const parseLocationRecord = (entry: unknown): LocationRecord | null => {
  if (!entry || typeof entry !== "object") {
    return null
  }

  const raw = entry as Record<string, unknown>
  const id = normalizeLocationId(raw.id)
  if (id === null) {
    return null
  }

  const shelfUnit =
    normalizeShelfUnitId(raw.shelf_unit_id) ??
    normalizeShelfUnitId(raw.shelfUnitId) ??
    normalizeShelfUnitId(raw.shelfunit) ??
    normalizeShelfUnitId(raw.shelf)

  return {
    id,
    shelfUnitId: shelfUnit,
  }
}

export default function ItemDetailsPage() {
  const params = useParams<{ itemId?: string }>()
  const itemId = React.useMemo(() => {
    if (!params.itemId) return null
    const parsed = Number.parseInt(params.itemId, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null
    }
    return parsed
  }, [params.itemId])

  const [item, setItem] = React.useState<ItemRecord | null>(null)
  const [form, setForm] = React.useState<ItemFormState>({ name: "", category: "" })
  const [inventory, setInventory] = React.useState<InventoryRecord[]>([])
  const [locationEdits, setLocationEdits] = React.useState<Record<number, number>>({})
  const [locationActions, setLocationActions] = React.useState<
    Record<number, { saving: boolean; error: string | null; success: string | null }>
  >({})
  const [shelfUnitDetails, setShelfUnitDetails] = React.useState<Record<string, ShelfUnitDetail | null>>({})
  const [locationsById, setLocationsById] = React.useState<Record<number, LocationRecord>>({})
  const [history, setHistory] = React.useState<LoanHistoryEntry[]>([])
  const [personsById, setPersonsById] = React.useState<Record<number, NormalizedPerson>>({})

  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState<boolean>(false)

  const fetchDetails = React.useCallback(async () => {
    if (itemId === null) return
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const controller = new AbortController()
      const [itemRes, inventoryRes, locationsRes, historyRes, personsRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/items/${itemId}`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/inventory/item/${itemId}`, {
            signal: controller.signal,
          }),
          fetch(`${API_BASE_URL}/locations`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/loans/item/${itemId}/history`, {
            signal: controller.signal,
          }),
          fetch(`${API_BASE_URL}/persons`, { signal: controller.signal }),
        ])

      if (!itemRes.ok) {
        throw new Error(`Failed to load item (HTTP ${itemRes.status})`)
      }
      if (!inventoryRes.ok) {
        throw new Error(
          `Failed to load inventory records (HTTP ${inventoryRes.status})`
        )
      }
      if (!locationsRes.ok) {
        throw new Error(
          `Failed to load locations (HTTP ${locationsRes.status})`
        )
      }
      if (!historyRes.ok) {
        throw new Error(
          `Failed to load loan history (HTTP ${historyRes.status})`
        )
      }
      if (!personsRes.ok) {
        throw new Error(
          `Failed to load persons (HTTP ${personsRes.status})`
        )
      }

      const itemJson: unknown = await itemRes.json()
      const inventoryJson: unknown = await inventoryRes.json()
      const locationsJson: unknown = await locationsRes.json()
      const historyJson: unknown = await historyRes.json()
      const personsJson: unknown = await personsRes.json()

      const parsedItem =
        itemJson && typeof itemJson === "object"
          ? (itemJson as ItemRecord)
          : null
      if (!parsedItem) {
        throw new Error("Item payload was malformed.")
      }

      const parsedInventory: InventoryRecord[] = Array.isArray(inventoryJson)
        ? (inventoryJson as InventoryRecord[])
        : []

      const parsedLocations: LocationRecord[] = Array.isArray(locationsJson)
        ? (locationsJson as unknown[])
            .map(parseLocationRecord)
            .filter((location): location is LocationRecord => location !== null)
        : []

      const parsedHistory: LoanHistoryEntry[] = Array.isArray(historyJson)
        ? (historyJson as LoanHistoryEntry[])
        : []

      const personRawList: unknown[] = Array.isArray(personsJson)
        ? personsJson
        : Array.isArray((personsJson as { persons?: unknown }).persons)
          ? ((personsJson as { persons?: unknown }).persons as unknown[])
          : Array.isArray((personsJson as { results?: unknown }).results)
            ? ((personsJson as { results?: unknown }).results as unknown[])
            : []

      const normalizedPersons = personRawList
        .map(normalizePerson)
        .filter((person): person is NormalizedPerson => Boolean(person))

      const personsMap = normalizedPersons.reduce<Record<number, NormalizedPerson>>(
        (acc, person) => {
          acc[person.id] = person
          return acc
        },
        {}
      )

      const locationsMap = parsedLocations.reduce<Record<number, LocationRecord>>(
        (acc, location) => {
          acc[location.id] = location
          return acc
        },
        {}
      )

      const sortedHistory = parsedHistory
        .map((entry) => ({
          ...entry,
          returned: Boolean(entry.returned),
          returned_at: entry.returned_at ?? null,
        }))
        .sort((a, b) => {
          const aTime = new Date(a.begin).getTime()
          const bTime = new Date(b.begin).getTime()
          if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
          if (Number.isNaN(aTime)) return 1
          if (Number.isNaN(bTime)) return -1
          return bTime - aTime
        })

      setItem(parsedItem)
      setForm({
        name: parsedItem.name ?? "",
        category: parsedItem.category ?? "",
      })
      setInventory(parsedInventory)
      setLocationEdits(
        parsedInventory.reduce<Record<number, number>>((acc, record) => {
          acc[record.id] = record.location_id
          return acc
        }, {})
      )
      setLocationActions({})
      setLocationsById(locationsMap)
      setShelfUnitDetails({})
      setHistory(sortedHistory)
      setPersonsById(personsMap)
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Failed to load item details."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  React.useEffect(() => {
    if (itemId === null) return
    void fetchDetails()
  }, [fetchDetails, itemId])

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    setSuccessMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (itemId === null) return
    if (!form.name.trim()) {
      setError("Name is required.")
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim() || null,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update item (HTTP ${response.status})`)
      }

      const updated = (await response.json()) as ItemRecord
      setItem(updated)
      setForm({
        name: updated.name ?? "",
        category: updated.category ?? "",
      })
      setSuccessMessage("Item updated successfully.")
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Failed to update item."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const updateLocationAction = React.useCallback(
    (recordId: number, updates: Partial<{ saving: boolean; error: string | null; success: string | null }>) => {
      setLocationActions((prev) => {
        const current = prev[recordId] ?? {
          saving: false,
          error: null,
          success: null,
        }
        return {
          ...prev,
          [recordId]: { ...current, ...updates },
        }
      })
    },
    []
  )

  const handleLocationSelect = (recordId: number, value: string) => {
    const nextLocationId = Number.parseInt(value, 10)
    if (!Number.isFinite(nextLocationId)) {
      return
    }
    setLocationEdits((prev) => ({
      ...prev,
      [recordId]: nextLocationId,
    }))
    updateLocationAction(recordId, { error: null, success: null })
  }

  const handleLocationReset = (recordId: number, originalLocationId: number) => {
    setLocationEdits((prev) => ({
      ...prev,
      [recordId]: originalLocationId,
    }))
    updateLocationAction(recordId, { error: null, success: null })
  }

  const handleLocationSave = async (recordId: number) => {
    const record = inventory.find((entry) => entry.id === recordId)
    if (!record) {
      updateLocationAction(recordId, {
        error: "Inventory record was not found.",
        success: null,
      })
      return
    }

    const nextLocationId = locationEdits[recordId]
    if (!Number.isFinite(nextLocationId)) {
      updateLocationAction(recordId, {
        error: "Select a valid location before saving.",
        success: null,
      })
      return
    }

    if (nextLocationId === record.location_id) {
      updateLocationAction(recordId, {
        success: "No changes to save.",
        error: null,
      })
      window.setTimeout(() => {
        updateLocationAction(recordId, { success: null })
      }, 2000)
      return
    }

    updateLocationAction(recordId, {
      saving: true,
      error: null,
      success: null,
    })

    try {
      const payload = {
        item_id: record.item_id,
        location_id: nextLocationId,
        amount: record.amount,
        note: record.note ?? null,
      }

      const response = await fetch(`${API_BASE_URL}/inventory/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to update inventory record (HTTP ${response.status})`)
      }

      const updated: InventoryRecord = await response.json()

      setInventory((prev) =>
        prev.map((entry) =>
          entry.id === recordId
            ? {
                ...entry,
                location_id: updated.location_id,
                amount: updated.amount,
                note: updated.note,
              }
            : entry
        )
      )
      setLocationEdits((prev) => ({
        ...prev,
        [recordId]: updated.location_id,
      }))
      updateLocationAction(recordId, {
        saving: false,
        success: "Location updated.",
        error: null,
      })
      window.setTimeout(() => {
        updateLocationAction(recordId, { success: null })
      }, 3000)
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Failed to update inventory location."
      updateLocationAction(recordId, {
        saving: false,
        error: message,
        success: null,
      })
    }
  }

  const activeLoans = React.useMemo(
    () => history.filter((entry) => !entry.returned),
    [history]
  )

  const totalBorrowed = React.useMemo(
    () =>
      history.reduce((sum, entry) => {
        const amount = Number.isFinite(entry.amount) ? entry.amount : 0
        return sum + amount
      }, 0),
    [history]
  )

  const totalStocked = React.useMemo(
    () =>
      inventory.reduce((sum, record) => {
        const amount = Number.isFinite(record.amount) ? record.amount : 0
        return sum + amount
      }, 0),
    [inventory]
  )

  React.useEffect(() => {
    const uniqueUnitIds = new Set<string>()
    for (const location of Object.values(locationsById)) {
      const unitId = location.shelfUnitId?.trim()
      if (unitId && unitId.length > 0) {
        uniqueUnitIds.add(unitId)
      }
    }

    const missing = Array.from(uniqueUnitIds).filter(
      (unitId) => shelfUnitDetails[unitId] === undefined
    )

    if (missing.length === 0) {
      return
    }

    let cancelled = false

    ;(async () => {
      const entries = await Promise.all(
        missing.map(async (unitId) => {
          const detail = await fetchShelfUnitDetail(unitId)
          return [unitId, detail] as const
        })
      )

      if (cancelled) {
        return
      }

      setShelfUnitDetails((prev) => {
        const next = { ...prev }
        for (const [unitId, detail] of entries) {
          next[unitId] = detail
        }
        return next
      })
    })().catch(() => {
      // Swallow errors; individual fetch helpers already handle failures.
    })

    return () => {
      cancelled = true
    }
  }, [locationsById, shelfUnitDetails])

  const locationOptions = React.useMemo(() => {
    return Object.values(locationsById)
      .map((location) => {
        const unitId = location.shelfUnitId?.trim() ?? null
        const unitDetail = unitId ? shelfUnitDetails[unitId] ?? null : null

        const building =
          unitDetail?.building?.trim() ?? "Unknown building"
        const room = unitDetail?.room?.trim() ?? null
        const shelfName =
          unitDetail?.shelf_name?.trim() ??
          unitDetail?.shelf_id?.trim() ??
          null
        const unitLabel = unitDetail?.id?.trim() ?? unitId ?? null

        const parts: string[] = [building]
        if (room && room.length > 0) {
          parts.push(`Room ${room}`)
        }
        if (shelfName && shelfName.length > 0) {
          parts.push(shelfName)
        }
        if (unitLabel && unitLabel.length > 0) {
          parts.push(`Unit ${unitLabel}`)
        }

        return {
          value: location.id,
          label: parts.join(" · "),
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [locationsById, shelfUnitDetails])

  if (itemId === null) {
    return (
      <div className="container mx-auto max-w-4xl space-y-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Item not found</h1>
        <p className="text-sm text-muted-foreground">
          The provided item identifier is invalid. Please use the navigation or search to find a valid item.
        </p>
        <Button asChild>
          <Link to="/search">Return to search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-10 py-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {item?.name ?? "Loading item…"}
          </h1>
          <span className="rounded-md border border-muted-foreground/40 px-2 py-1 text-xs font-mono text-muted-foreground">
            ID: {itemId}
          </span>
        </div>
        {item?.category ? (
          <p className="text-sm text-muted-foreground">
            Category: <span className="font-medium">{item.category}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No category set.</p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Active loans
          </p>
          <p className="mt-2 text-3xl font-semibold">{activeLoans.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Loans that have not been returned yet.
          </p>
        </article>
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Total borrowed
          </p>
          <p className="mt-2 text-3xl font-semibold">{totalBorrowed}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sum of amounts across full history.
          </p>
        </article>
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Stocked units
          </p>
          <p className="mt-2 text-3xl font-semibold">{totalStocked}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current recorded inventory.
          </p>
        </article>
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            History entries
          </p>
          <p className="mt-2 text-3xl font-semibold">{history.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Loans registered for this item.
          </p>
        </article>
      </section>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-medium">Edit item</h2>
            <p className="text-xs text-muted-foreground">
              Update the name or category and sync with the Lagertool API.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-xs text-muted-foreground">Refreshing…</span>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => void fetchDetails()}>
              Refresh
            </Button>
          </div>
        </div>
        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Name *
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleFieldChange}
                placeholder="Enter item name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="category"
                className="text-sm font-medium text-foreground"
              >
                Category
              </label>
              <input
                id="category"
                name="category"
                value={form.category}
                onChange={handleFieldChange}
                placeholder="Optional category"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
          </div>

          {successMessage ? (
            <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600">
              {successMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!item) return
                setForm({
                  name: item.name ?? "",
                  category: item.category ?? "",
                })
                setError(null)
                setSuccessMessage(null)
              }}
              disabled={saving}
            >
              Revert
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-medium">Inventory placements</h2>
            <p className="text-xs text-muted-foreground">
              Every storage record associated with this item.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Inventory ID</th>
                <th className="px-6 py-3 font-medium">Move to</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                    colSpan={5}
                  >
                    No inventory records for this item yet.
                  </td>
                </tr>
              ) : (
                inventory.map((record) => {
                  const location = locationsById[record.location_id]
                  const unitId = location?.shelfUnitId?.trim() ?? null
                  const unitDetail = unitId ? shelfUnitDetails[unitId] ?? null : null

                  const buildingLabel =
                    unitDetail?.building?.trim() ?? "Unknown building"
                  const roomLabel = unitDetail?.room?.trim() ?? null
                  const shelfLabel =
                    unitDetail?.shelf_name?.trim() ??
                    unitDetail?.shelf_id?.trim() ??
                    null
                  const shelfUnitLabel = unitDetail?.id?.trim() ?? unitId ?? null

                  return (
                    <tr key={record.id} className="text-sm">
                      <td className="px-6 py-4">
                        <div className="font-medium">{buildingLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          Room: {roomLabel ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Shelf ID: {shelfLabel ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Shelf unit: {shelfUnitLabel ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Location ID: {record.location_id}
                        </div>
                      </td>
                    <td className="px-6 py-4 font-medium">{record.amount}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {record.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          value={locationEdits[record.id] ?? record.location_id}
                          onChange={(event) => handleLocationSelect(record.id, event.target.value)}
                        >
                          {locationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Current: {[
                            buildingLabel,
                            roomLabel ? `Room ${roomLabel}` : null,
                            shelfLabel,
                            shelfUnitLabel ? `Unit ${shelfUnitLabel}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={locationActions[record.id]?.saving}
                          onClick={() => void handleLocationSave(record.id)}
                        >
                          {locationActions[record.id]?.saving ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={locationActions[record.id]?.saving}
                          onClick={() => handleLocationReset(record.id, record.location_id)}
                        >
                          Reset
                        </Button>
                      </div>
                      {locationActions[record.id]?.error ? (
                        <p className="mt-2 text-xs text-destructive">
                          {locationActions[record.id]?.error}
                        </p>
                      ) : null}
                      {locationActions[record.id]?.success ? (
                        <p className="mt-2 text-xs text-emerald-600">
                          {locationActions[record.id]?.success}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-medium">Borrowing history</h2>
            <p className="text-xs text-muted-foreground">
              Complete loan history pulled from the Lagertool API. Active loans are highlighted.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Borrower</th>
                <th className="px-6 py-3 font-medium">Slack</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Borrowed</th>
                <th className="px-6 py-3 font-medium">Due</th>
                <th className="px-6 py-3 font-medium">Returned</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                    colSpan={7}
                  >
                    No loans on record for this item.
                  </td>
                </tr>
              ) : (
                history.map((entry) => {
                  const person = personsById[entry.person_id]
                  const statusLabel = entry.returned ? "Returned" : "Active"
                  const statusClasses = entry.returned
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"

                  return (
                    <tr
                      key={entry.id}
                      className={!entry.returned ? "bg-amber-50/70" : undefined}
                    >
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">
                          <Link
                            to={`/persons/${entry.person_id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {personDisplayName(person)}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Person ID: {entry.person_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {person?.slackId ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {entry.amount}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{formatDate(entry.begin)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(entry.begin)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{formatDate(entry.until)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(entry.until)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{entry.returned ? formatDate(entry.returned_at) : "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.returned ? formatDateTime(entry.returned_at) : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
                        >
                          {statusLabel}
                        </span>
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
