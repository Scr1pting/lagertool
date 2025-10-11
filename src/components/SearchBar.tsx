import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { HiOutlineMagnifyingGlass } from "react-icons/hi2"
import { useNavigate } from "react-router-dom"
import styles from "./NavBar.module.css"

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_DELAY = 250

type ItemResult = {
  id: number
  name?: string
  category?: string | null
}

type PersonResult = {
  id: number
  firstname?: string | null
  lastname?: string | null
  slack_id?: string | null
}

type SearchResult =
  | {
      kind: "item"
      id: string
      label: string
      meta?: string
    }
  | {
      kind: "person"
      id: string
      label: string
      meta?: string
      personId?: number
    }

interface SearchBarProps {
  initial?: string
}

export default function SearchBar({ initial = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initial)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const controllerRef = useRef<AbortController | null>(null)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmedQuery = useMemo(() => query.trim(), [query])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setActiveIndex(-1)
  }, [])

  const openDropdown = useCallback(() => {
    if (!isOpen) setIsOpen(true)
  }, [isOpen])

  const navigateToSearch = useCallback(
    (term: string) => {
      const searchTerm = term.trim()
      if (!searchTerm) return
      navigate(`/search?query=${encodeURIComponent(searchTerm)}`)
      closeDropdown()
    },
    [closeDropdown, navigate]
  )

  useEffect(() => {
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      controllerRef.current?.abort()
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    controllerRef.current = controller

    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const encodedName = encodeURIComponent(trimmedQuery)
        const searchUrl = `${API_BASE_URL}/items/search?name=${encodedName}`
        const personUrl = `${API_BASE_URL}/persons/search?firstname=${encodedName}&lastname=${encodedName}`

        const [itemsRes, personsRes] = await Promise.all([
          fetch(searchUrl, { signal: controller.signal }),
          fetch(personUrl, { signal: controller.signal }),
        ])

        if (!itemsRes.ok) {
          throw new Error(`Item search failed (HTTP ${itemsRes.status})`)
        }
        if (!personsRes.ok) {
          throw new Error(`Person search failed (HTTP ${personsRes.status})`)
        }

        const itemsJson: unknown = await itemsRes.json()
        const personsJson: unknown = await personsRes.json()

        const items = Array.isArray(itemsJson) ? itemsJson : []
        const persons = Array.isArray(personsJson) ? personsJson : []

        const nextResults: SearchResult[] = []

        items
          .filter((item): item is ItemResult => Boolean(item) && typeof item === "object")
          .forEach((item) => {
            if (!item.name) return
            nextResults.push({
              kind: "item",
              id: `item-${item.id ?? item.name}`,
              label: item.name,
              meta: item.category ?? undefined,
            })
          })

        persons
          .filter(
            (person): person is PersonResult => Boolean(person) && typeof person === "object"
          )
          .forEach((person) => {
            const firstname = person.firstname?.trim() ?? ""
            const lastname = person.lastname?.trim() ?? ""
            const label = [firstname, lastname].filter(Boolean).join(" ")
            if (!label) return
            const meta = person.slack_id ? `Slack: ${person.slack_id}` : undefined
            const numericId =
              typeof person.id === "number" && Number.isFinite(person.id)
                ? person.id
                : undefined
            nextResults.push({
              kind: "person",
              id: `person-${numericId ?? label}`,
              label,
              meta,
              personId: numericId,
            })
          })

        setResults(nextResults)
        setActiveIndex(nextResults.length ? 0 : -1)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        const message =
          caught instanceof Error ? caught.message : "Search failed. Please try again."
        setError(message)
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_DELAY)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [trimmedQuery])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [closeDropdown])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((prev) => {
        if (!results.length) return -1
        const nextIndex = prev + 1
        return nextIndex >= results.length ? 0 : nextIndex
      })
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((prev) => {
        if (!results.length) return -1
        if (prev <= 0) return results.length - 1
        return prev - 1
      })
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        const selected = results[activeIndex]
        setQuery(selected.label)
        if (selected.kind === "person" && typeof selected.personId === "number") {
          navigate(`/persons/${selected.personId}`)
          closeDropdown()
        } else {
          navigateToSearch(selected.label)
        }
      } else {
        navigateToSearch(trimmedQuery)
      }
    } else if (event.key === "Escape") {
      closeDropdown()
      inputRef.current?.blur()
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigateToSearch(trimmedQuery)
  }

  const shouldRenderPanel =
    isOpen &&
    trimmedQuery.length >= MIN_QUERY_LENGTH &&
    (loading || Boolean(error) || results.length > 0)

  const focusInput = React.useCallback(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  const handleWrapperMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null
      if (target?.closest("button")) {
        return
      }
      if (document.activeElement !== inputRef.current) {
        event.preventDefault()
        focusInput()
      }
    },
    [focusInput]
  )

  return (
    <div
      className={styles.searchWrapper}
      ref={containerRef}
      onMouseDown={handleWrapperMouseDown}
      onClick={() => {
        if (document.activeElement !== inputRef.current) {
          focusInput()
        }
      }}
    >
      <HiOutlineMagnifyingGlass className={styles.searchIcon} aria-hidden="true" />
      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder="Search for items or people"
          value={query}
          onFocus={openDropdown}
          onChange={(event) => {
            setQuery(event.target.value)
            openDropdown()
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search inventory"
          aria-expanded={shouldRenderPanel}
          aria-controls="search-suggestions"
          role="combobox"
          style={{ outline: 'none', border: 'none' }}
        />
      </form>

      {shouldRenderPanel && (
        <div
          id="search-suggestions"
          role="listbox"
          className={styles.searchDropdown}
        >
          {loading && <div className={styles.searchStatus}>Searching…</div>}
          {error && <div className={styles.searchError}>{error}</div>}
          {!loading && !error && results.length === 0 && (
            <div className={styles.searchStatus}>No matches yet.</div>
          )}
          {!error &&
            results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`${styles.searchResult} ${
                  index === activeIndex ? styles.searchResultActive : ""
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setQuery(result.label)
                  if (result.kind === "person" && typeof result.personId === "number") {
                    navigate(`/persons/${result.personId}`)
                    closeDropdown()
                  } else {
                    navigateToSearch(result.label)
                  }
                }}
              >
                <span className={styles.searchResultLabel}>{result.label}</span>
                {result.meta && (
                  <span className={styles.searchResultMeta}>{result.meta}</span>
                )}
                <span className={styles.searchResultKind}>
                  {result.kind === "item" ? "Item" : "Person"}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
