"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import RestrictedSearch, {
  type RestrictedSearchItem,
} from "@/components/RestrictedSearch"
import { Button } from "@/components/ui/button"
import FileUploader from "@/components/FileUploader"

type CategoryValue = "consumable" | "nonConsumable"

type InventoryRecord = {
  id: number
  item_id: number
  location_id: number
  amount: number
  note?: string | null
}

type ItemRecord = {
  id: number
  name: string
  category: string
}

type LocationRecord = {
  id: number
  campus?: string | null
  building?: string | null
  room?: string | null
  shelf?: string | null
  shelfunit?: string | null
}

type CombinedInventoryRow = InventoryRecord & {
  item?: ItemRecord
  location?: LocationRecord
}

type FormState = {
  name: string
  category: CategoryValue
  amount: string
}

type LocationOption = RestrictedSearchItem & { location: LocationRecord }

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const formatLocation = (location?: LocationRecord) => {
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

  return parts.join(" · ") || `Location ${location.id}`
}

const defaultFormState: FormState = {
  name: "",
  category: "consumable",
  amount: "",
}

export default function AddPage() {
  const [form, setForm] = React.useState<FormState>(defaultFormState)
  const [selectedLocation, setSelectedLocation] =
    React.useState<LocationOption | null>(null)

  const [inventoryRows, setInventoryRows] = React.useState<
    CombinedInventoryRow[]
  >([])
  const [locations, setLocations] = React.useState<LocationRecord[]>([])

  const [loading, setLoading] = React.useState<boolean>(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [rowActionId, setRowActionId] = React.useState<number | null>(null)
  const [editAmounts, setEditAmounts] = React.useState<Record<number, string>>(
    {}
  )

  const buildLocationOption = React.useCallback(
    (location: LocationRecord): LocationOption => ({
      id: location.id,
      label: String(location.id),
      description: formatLocation(location),
      location,
    }),
    []
  )

  const mergeInventoryData = React.useCallback(
    (
      inventory: InventoryRecord[],
      itemsList: ItemRecord[],
      locationsList: LocationRecord[]
    ): CombinedInventoryRow[] => {
      const itemMap = new Map(itemsList.map((item) => [item.id, item]))
      const locationMap = new Map(
        locationsList.map((location) => [location.id, location])
      )

      return inventory.map((record) => ({
        ...record,
        item: itemMap.get(record.item_id),
        location: locationMap.get(record.location_id),
      }))
    },
    []
  )

  const fetchInitialData = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [inventoryRes, itemsRes, locationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory`),
        fetch(`${API_BASE_URL}/items`),
        fetch(`${API_BASE_URL}/shelves`),
      ])

      if (!inventoryRes.ok) {
        throw new Error(`Failed to load inventory (HTTP ${inventoryRes.status})`)
      }
      if (!itemsRes.ok) {
        throw new Error(`Failed to load items (HTTP ${itemsRes.status})`)
      }
      if (!locationsRes.ok) {
        throw new Error(`Failed to load locations (HTTP ${locationsRes.status})`)
      }

      const inventoryJson = await inventoryRes.json()
      const itemsJson = await itemsRes.json()
      const locationsJson = await locationsRes.json()

      const inventoryData: InventoryRecord[] = Array.isArray(inventoryJson)
        ? inventoryJson
        : []
      const itemsData: ItemRecord[] = Array.isArray(itemsJson) ? itemsJson : []
      const locationsData: LocationRecord[] = Array.isArray(locationsJson)
        ? locationsJson
        : []

      setLocations(locationsData)

      const merged = mergeInventoryData(inventoryData, itemsData, locationsData)
      setInventoryRows(merged)

      setEditAmounts(
        merged.reduce<Record<number, string>>((acc, record) => {
          acc[record.id] = String(record.amount ?? 0)
          return acc
        }, {})
      )
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load data."
      )
    } finally {
      setLoading(false)
    }
  }, [mergeInventoryData])

  React.useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const searchLocations = React.useCallback(
    async (query: string, limit: number) => {
      const trimmed = query.trim().toLowerCase()

      const filtered = locations
        .filter((location) => {
          if (!trimmed) return true
          const haystack = [
            location.id,
            location.building,
            location.room,
            location.shelf,
            location.shelfunit,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          return haystack.includes(trimmed)
        })
        .slice(0, limit)
        .map(buildLocationOption)

      return filtered
    },
    [buildLocationOption, locations]
  )

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const handleLocationSelect = (item: RestrictedSearchItem) => {
    const option = item as LocationOption
    setSelectedLocation(option)
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const trimmedName = form.name.trim()
    const amountValue = Number(form.amount)

    if (!trimmedName) {
      setSubmitError("Please provide a name for the object.")
      return
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setSubmitError("Amount must be a positive number.")
      return
    }

    if (!selectedLocation?.location) {
      setSubmitError("Choose a valid location ID from the list.")
      return
    }

    setIsSubmitting(true)

    try {
      const createItemRes = await fetch(`${API_BASE_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          category: form.category,
        }),
      })

      if (!createItemRes.ok) {
        throw new Error(`Failed to create item (HTTP ${createItemRes.status})`)
      }

      const createdItem: ItemRecord = await createItemRes.json()

      const locationId = Number(selectedLocation.id)

      const createInventoryRes = await fetch(`${API_BASE_URL}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: createdItem.id,
          location_id: locationId,
          amount: amountValue,
        }),
      })

      if (!createInventoryRes.ok) {
        throw new Error(
          `Failed to create inventory record (HTTP ${createInventoryRes.status})`
        )
      }

      await fetchInitialData()

      setForm((prev) => ({
        ...defaultFormState,
        category: prev.category,
      }))
      setSelectedLocation(null)
      setSubmitSuccess("Item added successfully.")
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save the inventory record."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAmountInputChange = (id: number, value: string) => {
    setEditAmounts((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleUpdateAmount = async (recordId: number) => {
    const rawValue = editAmounts[recordId]
    const parsed = Number(rawValue)

    if (!Number.isFinite(parsed) || parsed < 0) {
      setSubmitError("Amount must be zero or a positive number.")
      return
    }

    setRowActionId(recordId)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${recordId}/amount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      })

      if (!res.ok) {
        throw new Error(`Failed to update amount (HTTP ${res.status})`)
      }

      const updatedRecord: InventoryRecord = await res.json()

      setInventoryRows((prev) =>
        prev.map((record) =>
          record.id === recordId
            ? {
                ...record,
                amount: updatedRecord.amount,
              }
            : record
        )
      )

      setEditAmounts((prev) => ({
        ...prev,
        [recordId]: String(updatedRecord.amount ?? parsed),
      }))

      setSubmitSuccess("Amount updated.")
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update amount."
      )
    } finally {
      setRowActionId(null)
    }
  }

  const handleDeleteRecord = async (recordId: number) => {
    setRowActionId(recordId)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${recordId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error(`Failed to delete inventory (HTTP ${res.status})`)
      }

      setInventoryRows((prev) => prev.filter((record) => record.id !== recordId))
      setEditAmounts((prev) => {
        const next = { ...prev }
        delete next[recordId]
        return next
      })
      setSubmitSuccess("Inventory record deleted.")
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to delete record."
      )
    } finally {
      setRowActionId(null)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-10 px-4">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Manage Inventory
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create new inventory entries and manage existing records using the
          Lagertool API.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {loadError}
        </p>
      ) : null}

      <form
        className="space-y-6 rounded-lg border bg-card px-6 py-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <fieldset className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="name"
            >
              Object name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="e.g. Soldering Iron"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="category"
            >
              Category
            </label>
            <input
              id="category"
              name="category"
              value="Electronics"
              onChange={handleInputChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
            </input>
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="amount"
            >
              Amount
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              value={form.amount}
              onChange={handleInputChange}
              placeholder="Enter quantity"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Location ID
            </label>
            <RestrictedSearch
              placeholder="Search for a location ID…"
              onSelect={handleLocationSelect}
              searchFn={searchLocations}
              selectedLabel={selectedLocation?.label}
              minChars={1}
            />
            <div className="text-xs text-muted-foreground">
              {selectedLocation?.location ? (
                <>
                  <span className="font-medium">Selected location:</span>{" "}
                  {formatLocation(selectedLocation.location)} (
                  <span className="font-mono">{selectedLocation.label}</span>)
                </>
              ) : (
                "Pick an entry to see the full location description."
              )}
            </div>
          </div>
        </fieldset>

        {submitError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
            {submitError}
          </p>
        ) : null}

        {submitSuccess ? (
          <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600">
            {submitSuccess}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(defaultFormState)
              setSelectedLocation(null)
              setSubmitError(null)
              setSubmitSuccess(null)
            }}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              fetchInitialData()
            }}
            disabled={loading}
          >
            Refresh data
          </Button>
          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting ? "Saving…" : "Save item"}
          </Button>
        </div>
      </form>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-medium">Bulk upload inventory </h2>
        </div>
        <div className="px-6 py-6">
          <div className="max-w-xl">
            <FileUploader
              wrapInCard={false}
              uploadUrl={`${API_BASE_URL}/bulkadd`}
              templateUrl="/TemplateBulkAdd.csv"
            />
          </div>
        </div>
      </section>


      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-medium">Inventory records</h2>
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventoryRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                  >
                    No inventory records yet.
                  </td>
                </tr>
              ) : (
                inventoryRows.map((record) => (
                  <tr key={record.id} className="text-sm">
                    <td className="px-6 py-4">
                      <div className="font-medium">
                        <Link
                          to={`/items/${record.item_id}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {record.item?.name ?? `Item #${record.item_id}`}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {record.item_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.item?.category ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div>{formatLocation(record.location)}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {record.location_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        value={editAmounts[record.id] ?? ""}
                        onChange={(event) =>
                          handleAmountInputChange(record.id, event.target.value)
                        }
                        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateAmount(record.id)}
                          disabled={rowActionId === record.id}
                        >
                          {rowActionId === record.id ? "Saving…" : "Update"}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                          disabled={rowActionId === record.id}
                        >
                          {rowActionId === record.id ? "Removing…" : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
