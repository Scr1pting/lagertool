"use client"

import * as React from "react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  normalizePerson,
  personDisplayName,
  type NormalizedPerson,
} from "@/lib/person"

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
  campus?: string | null
  building?: string | null
  room?: string | null
  shelf?: string | null
  shelfunit?: string | null
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

const summarizeLocation = (location?: LocationRecord) => {
  if (!location) {
    return "Unknown location"
  }

  const shelfSegment = [location.shelf, location.shelfunit]
    .filter(Boolean)
    .join(" ")

  const parts = [
    location.campus,
    location.building,
    location.room,
    shelfSegment || null,
  ].filter(Boolean)

  return parts.join(" · ") || `Location #${location.id}`
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
        ? (locationsJson as LocationRecord[])
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
      setLocationsById(locationsMap)
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                    colSpan={3}
                  >
                    No inventory records for this item yet.
                  </td>
                </tr>
              ) : (
                inventory.map((record) => (
                  <tr key={record.id} className="text-sm">
                    <td className="px-6 py-4">
                      <div className="font-medium">
                        {summarizeLocation(locationsById[record.location_id])}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Location ID: {record.location_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{record.amount}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {record.id}
                    </td>
                  </tr>
                ))
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
                <th className="px-6 py-3 font-medium text-right">Status</th>
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
                      <td className="px-6 py-4 text-right">
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
