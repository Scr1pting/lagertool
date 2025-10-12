import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { HiOutlineMagnifyingGlass } from "react-icons/hi2"
import { cn } from "@/lib/utils"

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

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

export default function Search() {
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get("query") ?? ""
  const trimmedQuery = queryParam.trim()

  const [items, setItems] = useState<ItemResult[]>([])
  const [persons, setPersons] = useState<PersonResult[]>([])
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
          ? itemJson.filter(
              (entry): entry is ItemResult =>
                entry !== null &&
                typeof entry === "object" &&
                "id" in entry &&
                typeof (entry as ItemResult).id === "number" &&
                "name" in entry
            )
          : []

        const nextPersons: PersonResult[] = Array.isArray(personJson)
          ? personJson.filter(
              (entry): entry is PersonResult =>
                entry !== null && typeof entry === "object" && "id" in entry
            )
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
  const hasResults = items.length > 0 || persons.length > 0
  const totalResults = items.length + persons.length

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Search</h1>
        {hasQuery ? (
          <p className="text-muted-foreground">
            Live results for <span className="font-semibold text-foreground">"{trimmedQuery}"</span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Start typing in the search bar above to see live results
          </p>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-6">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Empty State - No Query */}
      {!hasQuery && !loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
            <HiOutlineMagnifyingGlass className="text-muted-foreground" size={40} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Ready to search</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Type in the search bar to find items, people, and more from your inventory. Results
            appear instantly as you type.
          </p>
        </div>
      )}

      {/* Results */}
      {hasQuery && !loading && !error && (
        <>
          {hasResults ? (
            <div className="space-y-6">
              {/* Results Summary */}
              <div className="flex items-center gap-2 pb-4 border-b">
                <span className="text-sm font-medium text-muted-foreground">
                  {totalResults} {totalResults === 1 ? "result" : "results"} found
                </span>
                {items.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                )}
                {persons.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {persons.length} {persons.length === 1 ? "person" : "people"}
                  </span>
                )}
              </div>

              {/* Items Results */}
              {items.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    Items
                  </h2>
                  <div className="grid gap-3">
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        to={`/items/${item.id}`}
                        className={cn(
                          "group block p-4 rounded-lg border border-border bg-card",
                          "hover:bg-accent hover:border-primary/50 transition-all duration-200",
                          "hover:shadow-md"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl">
                              📦
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {item.name}
                            </h3>
                            {item.category && (
                              <p className="text-sm text-muted-foreground truncate">
                                {item.category}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-5 h-5 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* People Results */}
              {persons.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">👤</span>
                    People
                  </h2>
                  <div className="grid gap-3">
                    {persons.map((person) => {
                      const firstname = person.firstname?.trim() ?? ""
                      const lastname = person.lastname?.trim() ?? ""
                      const name = [firstname, lastname].filter(Boolean).join(" ") || "Unknown"

                      return (
                        <Link
                          key={person.id}
                          to={`/persons/${person.id}`}
                          className={cn(
                            "group block p-4 rounded-lg border border-border bg-card",
                            "hover:bg-accent hover:border-primary/50 transition-all duration-200",
                            "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl">
                                👤
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {name}
                              </h3>
                              {person.slack_id && (
                                <p className="text-sm text-muted-foreground truncate">
                                  @{person.slack_id}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg
                                className="w-5 h-5 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State - No Results */
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <HiOutlineMagnifyingGlass className="text-muted-foreground" size={32} />
              </div>
              <h3 className="text-lg font-semibold mb-1">No results found</h3>
              <p className="text-sm text-muted-foreground">
                Try searching with different keywords or check your spelling
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
