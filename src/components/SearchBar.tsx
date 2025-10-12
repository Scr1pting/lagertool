import React, { useCallback, useEffect, useRef, useState } from "react"
import { HiOutlineMagnifyingGlass } from "react-icons/hi2"
import { useNavigate, useLocation } from "react-router-dom"
import styles from "./NavBar.module.css"

const DEBOUNCE_DELAY = 300

interface SearchBarProps {
  initial?: string
}

export default function SearchBar({ initial = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initial)
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<number | null>(null)

  // Sync query with URL when on search page
  useEffect(() => {
    if (location.pathname === "/search") {
      const params = new URLSearchParams(location.search)
      const urlQuery = params.get("query") || ""
      if (urlQuery !== query) {
        setQuery(urlQuery)
      }
    }
  }, [location])

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)

      // Clear existing timer
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }

      // Navigate to search page with debounced query update
      debounceTimerRef.current = window.setTimeout(() => {
        if (newQuery.trim()) {
          navigate(`/search?query=${encodeURIComponent(newQuery.trim())}`, {
            replace: location.pathname === "/search",
          })
        } else if (location.pathname === "/search") {
          navigate("/search", { replace: true })
        }
      }, DEBOUNCE_DELAY)
    },
    [navigate, location.pathname]
  )

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      // Clear debounce timer and navigate immediately on submit
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
      navigate(`/search?query=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      inputRef.current?.blur()
    }
  }

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  const handleWrapperMouseDown = useCallback(
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      className={styles.searchWrapper}
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
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search inventory"
          style={{ outline: "none", border: "none" }}
        />
      </form>
    </div>
  )
}
