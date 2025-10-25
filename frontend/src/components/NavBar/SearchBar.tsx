import { useEffect, useRef, useState } from "react"

import { HiOutlineMagnifyingGlass } from "react-icons/hi2"
import { useNavigate, useLocation } from "react-router-dom"
import styles from "./NavBar.module.css"

interface SearchBarProps {
  initial?: string
}

export default function SearchBar({ initial = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initial)
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync Navigation
  useEffect(() => {
    if (location.pathname === "/search") {
      const params = new URLSearchParams(location.search)
      const urlQuery = params.get("query") || ""
      if (urlQuery !== query) {
        setQuery(urlQuery)
      }
    }
  }, [location])

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
