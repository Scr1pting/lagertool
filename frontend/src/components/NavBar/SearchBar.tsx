import { useEffect, useRef, useState, type MouseEvent, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react"

import { useNavigate, useLocation } from "react-router-dom"
import styles from "./NavBar.module.css"
import { ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar"
import { Input } from "../ui/input"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { useDate } from "@/store/useDate"


interface SearchBarProps {
  initial?: string
}

export default function SearchBar({ initial = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initial)
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldNavigateRef = useRef(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const selectedRange = useDate((state) => state.selectedRange)
  const setRange = useDate((state) => state.setRange)
  const clearRange = useDate((state) => state.clearRange)

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

  const handleRangeSelect = (range?: DateRange) => {
    setRange(range)
  }

  const handleClearDate = () => {
    clearRange()
  }

  const handleApplyRange = () => {
    if (selectedRange?.from && selectedRange?.to) {
      setIsCalendarOpen(false)
    }
  }

  const formatDate = (date?: Date) => {
    return date ? format(date, "dd MMM yyyy") : ""
  }

  return (
    <div
      className={styles.searchWrapper}
      onMouseDown={handleWrapperMouseDown}
    >
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            aria-label="Open calendar search filters"
            variant="ghost"
            data-state={isCalendarOpen ? "open" : undefined}
            className={cn(
              styles.iconButton,
              (isCalendarOpen || selectedRange?.from) && styles.iconButtonActive,
              "hover:bg-transparent active:bg-transparent focus-visible:bg-transparent"
            )}
          >
            <Search className={styles.iconButtonIcon} aria-hidden="true" />
            <ChevronDown className={styles.iconButtonIcon} aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className={cn("flex flex-col gap-3", styles.calendarPopover)}>
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={handleRangeSelect}
              className="shadow-sm"
              captionLayout="dropdown"
            />
            <div className={cn("flex gap-2", styles.dateInputs)}>
              <div className={styles.dateInputWrapper}>
                <Input
                  readOnly
                  placeholder="Start date"
                  value={formatDate(selectedRange?.from)}
                />
              </div>
              <div className={styles.dateInputWrapper}>
                <Input
                  readOnly
                  placeholder="End date"
                  value={formatDate(selectedRange?.to)}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearDate}
                disabled={!selectedRange?.from}
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={handleApplyRange}
                disabled={!(selectedRange?.from && selectedRange?.to)}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder="Search for items or people"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search inventory"
        />
      </form>
    </div>
  )
}
