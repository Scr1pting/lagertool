"use client"

import * as React from "react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  normalizePerson,
  personDisplayName,
  type NormalizedPerson,
} from "@/lib/person"

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

type ItemRecord = {
  id: number
  name: string
  category?: string | null
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

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

export default function PersonHistoryPage() {
  const params = useParams<{ personId?: string }>()
  const personId = React.useMemo(() => {
    if (!params.personId) return null
    const parsed = Number.parseInt(params.personId, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null
    }
    return parsed
  }, [params.personId])

  const [person, setPerson] = React.useState<NormalizedPerson | null>(null)
  const [activeLoans, setActiveLoans] = React.useState<LoanHistoryEntry[]>([])
  const [history, setHistory] = React.useState<LoanHistoryEntry[]>([])
  const [itemsById, setItemsById] = React.useState<Record<number, ItemRecord>>({})

  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchDetails = React.useCallback(async () => {
    if (personId === null) return
    setLoading(true)
    setError(null)

    try {
      const [personRes, activeRes, historyRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/persons/${personId}`),
        fetch(`${API_BASE_URL}/loans/person/${personId}`),
        fetch(`${API_BASE_URL}/loans/person/${personId}/history`),
        fetch(`${API_BASE_URL}/items`),
      ])

      if (!personRes.ok) {
        throw new Error(`Failed to load person (HTTP ${personRes.status})`)
      }
      if (!activeRes.ok) {
        throw new Error(
          `Failed to load borrowed items (HTTP ${activeRes.status})`
        )
      }
      if (!historyRes.ok) {
        throw new Error(
          `Failed to load borrowing history (HTTP ${historyRes.status})`
        )
      }
      if (!itemsRes.ok) {
        throw new Error(`Failed to load items (HTTP ${itemsRes.status})`)
      }

      const personJson = await personRes.json()
      const activeJson: unknown = await activeRes.json()
      const historyJson: unknown = await historyRes.json()
      const itemsJson: unknown = await itemsRes.json()

      const normalizedPerson = normalizePerson(personJson)
      if (!normalizedPerson) {
        throw new Error("Person payload was malformed.")
      }

      const parsedActive: LoanHistoryEntry[] = Array.isArray(activeJson)
        ? (activeJson as LoanHistoryEntry[])
        : []
      const parsedHistory: LoanHistoryEntry[] = Array.isArray(historyJson)
        ? (historyJson as LoanHistoryEntry[])
        : []

      const parsedItems: ItemRecord[] = Array.isArray(itemsJson)
        ? (itemsJson as ItemRecord[])
        : []

      const itemsMap = parsedItems.reduce<Record<number, ItemRecord>>(
        (acc, item) => {
          acc[item.id] = item
          return acc
        },
        {}
      )

      const currentLoans = parsedActive
        .map((entry) => ({
          ...entry,
          returned: Boolean(entry.returned),
          returned_at: entry.returned_at ?? null,
        }))
        .filter((entry) => !entry.returned)
        .sort((a, b) => {
          const aTime = new Date(a.until).getTime()
          const bTime = new Date(b.until).getTime()
          if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
          if (Number.isNaN(aTime)) return 1
          if (Number.isNaN(bTime)) return -1
          return aTime - bTime
        })

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

      setPerson(normalizedPerson)
      setActiveLoans(currentLoans)
      setHistory(sortedHistory)
      setItemsById(itemsMap)
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Failed to load person details."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [personId])

  React.useEffect(() => {
    if (personId === null) return
    void fetchDetails()
  }, [fetchDetails, personId])

  const totalBorrowed = React.useMemo(
    () =>
      history.reduce((sum, entry) => {
        const amount = Number.isFinite(entry.amount) ? entry.amount : 0
        return sum + amount
      }, 0),
    [history]
  )

  const lastBorrowed = React.useMemo(() => {
    if (history.length === 0) return null
    const validDates = history
      .map((entry) => new Date(entry.begin))
      .filter((date) => !Number.isNaN(date.getTime()))
    if (!validDates.length) return null
    validDates.sort((a, b) => b.getTime() - a.getTime())
    return validDates[0].toISOString()
  }, [history])

  if (personId === null) {
    return (
      <div className="container mx-auto max-w-4xl space-y-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Person not found</h1>
        <p className="text-sm text-muted-foreground">
          The provided person identifier is invalid. Please use the navigation or search to locate a valid record.
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
            {personDisplayName(person ?? undefined)}
          </h1>
          <span className="rounded-md border border-muted-foreground/40 px-2 py-1 text-xs font-mono text-muted-foreground">
            ID: {personId}
          </span>
        </div>
        {person?.slackId ? (
          <p className="text-sm text-muted-foreground">
            Slack: <span className="font-mono">{person.slackId}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No Slack handle on record.</p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Active loans
          </p>
          <p className="mt-2 text-3xl font-semibold">{activeLoans.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Items this person still has borrowed.
          </p>
        </article>
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Total borrowed
          </p>
          <p className="mt-2 text-3xl font-semibold">{totalBorrowed}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sum of units across the complete history.
          </p>
        </article>
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            History entries
          </p>
          <p className="mt-2 text-3xl font-semibold">{history.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Individual loan records tied to this person.
          </p>
        </article>
        <article className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Last borrowed
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {lastBorrowed ? formatDate(lastBorrowed) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Most recent borrow timestamp.
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
            <h2 className="text-lg font-medium">Currently borrowed</h2>
            <p className="text-xs text-muted-foreground">
              Active loans for this person fetched from the Lagertool API.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {loading ? <span>Refreshing…</span> : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fetchDetails()}
            >
              Refresh
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Borrowed</th>
                <th className="px-6 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeLoans.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                    colSpan={4}
                  >
                    No active loans right now.
                  </td>
                </tr>
              ) : (
                activeLoans.map((entry) => {
                  const item = itemsById[entry.item_id]
                  return (
                    <tr key={`active-${entry.id}`} className="bg-amber-50/70">
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">
                          <Link
                            to={`/items/${entry.item_id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {item?.name ?? `Item #${entry.item_id}`}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Category: {item?.category ?? "—"}
                        </div>
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
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-medium">Borrowing history</h2>
            <p className="text-xs text-muted-foreground">
              Every recorded loan for this person pulled from the Lagertool API.
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Item</th>
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
                    colSpan={6}
                  >
                    No loans recorded for this person.
                  </td>
                </tr>
              ) : (
                history.map((entry) => {
                  const item = itemsById[entry.item_id]
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
                            to={`/items/${entry.item_id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {item?.name ?? `Item #${entry.item_id}`}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Category: {item?.category ?? "—"}
                        </div>
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
