import { useEffect, useRef, useState, type MouseEvent, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react"
import { useNavigate, useLocation } from "react-router"
import styles from "./NavBar.module.css"
import { Search } from "lucide-react"
import clsx from "clsx"


interface SearchBarProps {
  initial?: string
}

export default function SearchBar({ initial = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initial)
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldNavigateRef = useRef(false)

  // Sync state with URL query parameter
  useEffect(() => {
    if (location.pathname !== "/search") return
    
    const params = new URLSearchParams(location.search)
    const urlQuery = params.get("query") || ""
    if (urlQuery !== query) {
      setQuery(urlQuery)
    }
  }, [location.search, location.pathname])

  useEffect(() => {
    if (
      location.pathname === "/search" ||
      query === "" ||
      shouldNavigateRef.current
    ) {
      return
    }
    setQuery("")
  }, [location.pathname, query])

  // Navigate to search page when query changes, or home if empty
  useEffect(() => {
    const trimmed = query.trim()
    const onSearch = location.pathname === "/search"
    const targetSearch = trimmed ? `?query=${encodeURIComponent(trimmed)}` : ""

    if (trimmed) {
      if (onSearch) {
        if (location.search !== targetSearch) {
          navigate(`/search${targetSearch}`, { replace: true })
        }
      } else if (shouldNavigateRef.current) {
        navigate(`/search${targetSearch}`)
      }
    } else if (onSearch && shouldNavigateRef.current) {
      navigate("/")
    }

    shouldNavigateRef.current = false
  }, [query, navigate, location.pathname, location.search])

  // Keep input focused when clicking the wrapper
  const handleWrapperMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (
      target?.closest("button") ||
      target?.closest('[data-slot="popover-content"]')
    )
      return // Ignore buttons and popover interactions inside wrapper
    
    if (document.activeElement !== inputRef.current) {
      event.preventDefault()
      inputRef.current?.focus({ preventScroll: true })
    }
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    shouldNavigateRef.current = true
    setQuery(event.target.value)
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
      className={clsx(styles.input, styles.searchWrapper)}
      onMouseDown={handleWrapperMouseDown}
    >
      <Search className={styles.searchIcon} />
      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder="Search for items"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search inventory"
        />
      </form>
    </div>
  )
}
