import { useEffect, useRef, useState } from "react"

import { useDebounce } from "use-debounce";

import { HiOutlineMagnifyingGlass } from "react-icons/hi2"
import { useNavigate, useLocation } from "react-router-dom"
import styles from "./NavBar.module.css"

// Only update navigation 300ms after the user stopped typing
const DEBOUNCE_DELAY = 300

interface SearchBarProps {
  initial?: string
}

export default function SearchBar({ initial = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initial)
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)

  // MARK: Debounce
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

  // Only update query after debounce delay
  const [debouncedQuery] = useDebounce(query, DEBOUNCE_DELAY)
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed) {
      navigate(`/search?query=${encodeURIComponent(trimmed)}`, {
        replace: location.pathname === "/search",
      })
    } else if (location.pathname === "/search") {
      navigate("/search", { replace: true })
    }
  }, [debouncedQuery, navigate, location.pathname])


  // MARK: Search
  // keep input focused when clicking the wrapper (prevent mousedown blur)
  const focusInput = () => inputRef.current?.focus({ preventScroll: true })

  const handleWrapperMouseDown = (event: any) => {
    const target = (event.target as HTMLElement) || null
    // ignore clicks on buttons inside the wrapper
    if (target?.closest("button")) return
    if (document.activeElement !== inputRef.current) {
      event.preventDefault()
      focusInput()
    }
  }

  const handleQueryChange = (newQuery: string) => setQuery(newQuery)

  const handleSubmit = (event: any) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`/search?query=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleKeyDown = (event: any) => {
    if (event.key === "Escape") inputRef.current?.blur()
  }


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
