import { useEffect, useRef, useState, type MouseEvent, type FormEvent, type KeyboardEvent } from "react"

import { HiOutlineMagnifyingGlass } from "react-icons/hi2"
import { useNavigate, useLocation } from "react-router-dom"
import { useDebounce } from "../../hooks/useDebounce"
import styles from "./NavBar.module.css"

interface SearchBarProps {
  initial?: string
}

export default function SearchBar({ initial = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initial)
  const debouncedQuery = useDebounce(query, 300)
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync state with URL query parameter
  useEffect(() => {
    if (location.pathname !== "/search") return
    
    const params = new URLSearchParams(location.search)
    const urlQuery = params.get("query") || ""
    if (urlQuery !== query) {
      setQuery(urlQuery)
    }
  }, [location, query])

  // Navigate to search page when debounced query changes
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed) {
      navigate(`/search?query=${encodeURIComponent(trimmed)}`)
    }
  }, [debouncedQuery, navigate])

  // Keep input focused when clicking the wrapper
  const handleWrapperMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target?.closest("button")) return // Ignore buttons inside wrapper
    
    if (document.activeElement !== inputRef.current) {
      event.preventDefault()
      inputRef.current?.focus({ preventScroll: true })
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`/search?query=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      inputRef.current?.blur()
    }
  }

  return (
    <div
      className={styles.searchWrapper}
      onMouseDown={handleWrapperMouseDown}
    >
      <HiOutlineMagnifyingGlass className={styles.searchIcon} aria-hidden="true" />
      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder="Search for items or people"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search inventory"
        />
      </form>
    </div>
  )
}
