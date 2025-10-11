import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import DataTable from "../components/DataTable"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

type ItemResult = {
  id: number
  name: string
  category?: string | null
}

type PersonResult = {
  id: number
  firstname?: string | null
  lastname?: string | null
  slack_id?: string | null
}

type PersonRow = {
  id: number
  name: string
  slack: string
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const itemColumns: ColumnDef<ItemResult>[] = [
  {
    accessorKey: "name",
    header: "Item",
    cell: ({ row, getValue }) => {
      const label = getValue<string>() ?? `Item #${row.original.id}`
      return (
        <Link
          to={`/items/${row.original.id}`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => getValue<string | null | undefined>() ?? "—",
  },
]

const personColumns: ColumnDef<PersonRow>[] = [
  {
    accessorKey: "name",
    header: "Person",
    cell: ({ row, getValue }) => {
      const label = getValue<string>() ?? `Person #${row.original.id}`
      return (
        <Link
          to={`/persons/${row.original.id}`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      )
    },
  },
  {
    accessorKey: "slack",
    header: "Slack",
    cell: ({ getValue }) => getValue<string>() || "—",
  },
]

export default function Search() {
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get("query") ?? ""
  const trimmedQuery = queryParam.trim()

  const [items, setItems] = useState<ItemResult[]>([])
  const [persons, setPersons] = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trimmedQuery) {
      setItems([])
      setPersons([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const fetchResults = async () => {
      setLoading(true)
      setError(null)

      try {
        const encoded = encodeURIComponent(trimmedQuery)
        const [itemRes, personRes] = await Promise.all([
          fetch(`${API_BASE_URL}/items/search?name=${encoded}`, {
            signal: controller.signal,
          }),
          fetch(
            `${API_BASE_URL}/persons/search?firstname=${encoded}&lastname=${encoded}`,
            { signal: controller.signal }
          ),
        ])

        if (!itemRes.ok) {
          throw new Error(`Item search failed (HTTP ${itemRes.status})`)
        }
        if (!personRes.ok) {
          throw new Error(`Person search failed (HTTP ${personRes.status})`)
        }

        const itemJson: unknown = await itemRes.json()
        const personJson: unknown = await personRes.json()

        const nextItems: ItemResult[] = Array.isArray(itemJson)
          ? (itemJson.filter((entry): entry is ItemResult => {
              return (
                entry !== null &&
                typeof entry === "object" &&
                "id" in entry &&
                typeof (entry as ItemResult).id === "number" &&
                "name" in entry
              )
            }) as ItemResult[])
          : []

        const nextPersons: PersonRow[] = Array.isArray(personJson)
          ? (personJson
              .filter((entry): entry is PersonResult => {
                return entry !== null && typeof entry === "object" && "id" in entry
              })
              .map<PersonRow>((person) => {
                const firstname = person.firstname?.trim() ?? ""
                const lastname = person.lastname?.trim() ?? ""
                const name = [firstname, lastname].filter(Boolean).join(" ") || "Unknown"
                const slack = person.slack_id?.trim() ?? ""
                return {
                  id: person.id,
                  name,
                  slack,
                }
              })
              .filter((person) => Boolean(person.name)) as PersonRow[])
          : []

        setItems(nextItems)
        setPersons(nextPersons)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        const message =
          caught instanceof Error ? caught.message : "Search failed. Please try again."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
    return () => controller.abort()
  }, [trimmedQuery])

  const hasQuery = trimmedQuery.length > 0
  const resultsSummary = useMemo(() => {
    if (!hasQuery || loading) return ""
    const segments = []
    if (items.length) segments.push(`${items.length} item${items.length === 1 ? "" : "s"}`)
    if (persons.length)
      segments.push(`${persons.length} person${persons.length === 1 ? "" : "s"}`)
    if (!segments.length) return "No matches found."
    return `Found ${segments.join(" and ")}.`
  }, [hasQuery, items.length, loading, persons.length])

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        {hasQuery ? (
          <p className="text-muted-foreground">
            Showing results for <span className="font-medium">“{trimmedQuery}”</span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Type in the search bar above to find items or people across the inventory.
          </p>
        )}
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <Card className="animate-pulse">
          <CardContent>
            <div className="flex items-center justify-center gap-3 py-6 text-sm text-muted-foreground">
              <svg
                className="h-5 w-5 animate-spin text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Searching…
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && hasQuery && (
        <div className="space-y-6">
          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>Items</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {items.length} result{items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <CardDescription>Matches for your query</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={itemColumns} data={items} />
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>People</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {persons.length} result{persons.length === 1 ? "" : "s"}
                  </div>
                </div>
                <CardDescription>People matching your query</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={personColumns} data={persons} />
              </CardContent>
            </Card>
          </section>

          <p className="text-sm text-muted-foreground">{resultsSummary}</p>
        </div>
      )}
    </div>
  )
}
