"use client"

import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import DataTable from "@/components/DataTable"
import RestrictedSearch, {
  type RestrictedSearchItem,
} from "@/components/RestrictedSearch"
import { Button } from "@/components/ui/button"
import {
  normalizePerson,
  personDisplayName,
  type NormalizedPerson,
} from "@/lib/person"

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

type EventRecord = {
  id: number
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
}

type EventHelperRecord = {
  id: number
  event_id: number
  person_id: number
}

type EventLoanRecord = {
  id: number
  event_id: number
  item_id: number
  person_id: number
  amount: number
  borrowed_at?: string | null
  returned_at?: string | null
}

type LoanRecord = {
  id: number
  item_id: number
  person_id: number
  amount: number
  begin?: string | null
  until?: string | null
}

type ItemRecord = {
  id: number
  name: string
  category?: string | null
}

type EventStats = {
  helperCount: number
  activeLoanCount: number
}

type EventHelperView = EventHelperRecord & {
  person?: NormalizedPerson
}

type EventLoanView = EventLoanRecord & {
  item?: ItemRecord
  person?: NormalizedPerson
}

type ItemOption = RestrictedSearchItem & { item: ItemRecord }
type PersonOption = RestrictedSearchItem & { person: NormalizedPerson }

type EventSummary = {
  totalEvents: number
  activeEvents: number
  upcomingEvents: number
  activeLoans: number
  totalHelpers: number
}

const parseDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value?: string | null) => {
  const date = parseDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date)
}

const formatDateTime = (value?: string | null) => {
  const date = parseDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

const categorizeEvent = (
  event: EventRecord
): "active" | "upcoming" | "past" => {
  const now = new Date()
  const start = parseDate(event.start_date)
  const end = parseDate(event.end_date)

  if (start && end) {
    if (now < start) return "upcoming"
    if (now > end) return "past"
    return "active"
  }

  if (start && now < start) return "upcoming"
  if (end && now > end) return "past"
  return "active"
}

const getEventDurationLabel = (event: EventRecord) => {
  const startLabel = formatDate(event.start_date)
  const endLabel = formatDate(event.end_date)

  if (startLabel === "—" && endLabel === "—") {
    return "Dates not set"
  }

  if (endLabel === "—") {
    return `Starts ${startLabel}`
  }

  if (startLabel === "—") {
    return `Ends ${endLabel}`
  }

  return `${startLabel} → ${endLabel}`
}

const createEmptyStats = (): EventStats => ({
  helperCount: 0,
  activeLoanCount: 0,
})

const createEventSummary = (
  events: EventRecord[],
  statsMap: Record<number, EventStats>
): EventSummary => {
  const summary: EventSummary = {
    totalEvents: events.length,
    activeEvents: 0,
    upcomingEvents: 0,
    activeLoans: 0,
    totalHelpers: 0,
  }

  events.forEach((event) => {
    const category = categorizeEvent(event)
    if (category === "active") summary.activeEvents += 1
    if (category === "upcoming") summary.upcomingEvents += 1

    const stats = statsMap[event.id] ?? createEmptyStats()
    summary.totalHelpers += stats.helperCount
    summary.activeLoans += stats.activeLoanCount
  })

  return summary
}

const createDefaultEventForm = () => ({
  name: "",
  description: "",
  startDate: "",
  endDate: "",
})

const createDefaultLoanForm = () => ({
  amount: "1",
})

export default function EventsPage() {
  const [events, setEvents] = React.useState<EventRecord[]>([])
  const [eventStats, setEventStats] = React.useState<Record<number, EventStats>>(
    {}
  )
  const [selectedEventId, setSelectedEventId] = React.useState<number | null>(
    null
  )
  const [helpers, setHelpers] = React.useState<EventHelperRecord[]>([])
  const [eventLoans, setEventLoans] = React.useState<EventLoanRecord[]>([])
  const [itemsById, setItemsById] = React.useState<Record<number, ItemRecord>>(
    {}
  )
  const [personsById, setPersonsById] = React.useState<
    Record<number, NormalizedPerson>
  >({})
  const [allLoans, setAllLoans] = React.useState<LoanRecord[]>([])

  const [eventsLoading, setEventsLoading] = React.useState<boolean>(false)
  const [eventsError, setEventsError] = React.useState<string | null>(null)
  const [referenceLoading, setReferenceLoading] = React.useState<boolean>(false)
  const [referenceError, setReferenceError] = React.useState<string | null>(null)
  const [detailLoading, setDetailLoading] = React.useState<boolean>(false)
  const [detailError, setDetailError] = React.useState<string | null>(null)
  const [detailMessage, setDetailMessage] = React.useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = React.useState<boolean>(false)
  const [createForm, setCreateForm] = React.useState(
    () => createDefaultEventForm()
  )
  const [createError, setCreateError] = React.useState<string | null>(null)
  const [createBusy, setCreateBusy] = React.useState<boolean>(false)

  const [selectedHelper, setSelectedHelper] =
    React.useState<PersonOption | null>(null)
  const [helperBusyMap, setHelperBusyMap] = React.useState<Record<number, boolean>>(
    {}
  )

  const [loanForm, setLoanForm] = React.useState(() => createDefaultLoanForm())
  const [loanItem, setLoanItem] = React.useState<ItemOption | null>(null)
  const [loanPerson, setLoanPerson] = React.useState<PersonOption | null>(null)
  const [loanSubmitting, setLoanSubmitting] = React.useState<boolean>(false)
  const [loanError, setLoanError] = React.useState<string | null>(null)
  const [loanActionBusyMap, setLoanActionBusyMap] = React.useState<
    Record<number, boolean>
  >({})

  const [existingLoanId, setExistingLoanId] = React.useState<number | "">("")
  const [existingLoanBusy, setExistingLoanBusy] = React.useState<boolean>(false)

  const selectedEvent = React.useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )

  const helperViews = React.useMemo<EventHelperView[]>(
    () =>
      helpers.map((helper) => ({
        ...helper,
        person: personsById[helper.person_id],
      })),
    [helpers, personsById]
  )

  const eventLoanViews = React.useMemo<EventLoanView[]>(
    () =>
      eventLoans.map((loan) => ({
        ...loan,
        item: itemsById[loan.item_id],
        person: personsById[loan.person_id],
      })),
    [eventLoans, itemsById, personsById]
  )

  const summary = React.useMemo(
    () => createEventSummary(events, eventStats),
    [events, eventStats]
  )

  const existingLoanOptions = React.useMemo(
    () =>
      allLoans.map((loan) => {
        const item = itemsById[loan.item_id]
        const person = personsById[loan.person_id]
        const labelParts = [
          item?.name ?? `Item #${loan.item_id}`,
          person ? personDisplayName(person) : `Person #${loan.person_id}`,
        ]
        return {
          id: loan.id,
          label: labelParts.join(" · "),
        }
      }),
    [allLoans, itemsById, personsById]
  )

  const refreshEventStats = React.useCallback(
    (
      eventId: number,
      helpersList?: EventHelperRecord[],
      loansList?: EventLoanRecord[]
    ) => {
      setEventStats((prev) => ({
        ...prev,
        [eventId]: {
          helperCount:
            helpersList?.length ?? prev[eventId]?.helperCount ?? 0,
          activeLoanCount:
            loansList
              ?.filter((loan) => !loan.returned_at)
              .length ?? prev[eventId]?.activeLoanCount ?? 0,
        },
      }))
    },
    []
  )

  const loadEvents = React.useCallback(async () => {
    setEventsLoading(true)
    setEventsError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/events`)
      if (!response.ok) {
        throw new Error(`Failed to load events (HTTP ${response.status})`)
      }
      const data = await response.json()
      const eventsData: EventRecord[] = Array.isArray(data) ? data : []

      const sorted = [...eventsData].sort((a, b) => {
        const startA = parseDate(a.start_date)?.getTime() ?? Number.POSITIVE_INFINITY
        const startB = parseDate(b.start_date)?.getTime() ?? Number.POSITIVE_INFINITY
        if (startA === startB) return a.id - b.id
        return startA - startB
      })

      setEvents(sorted)

      if (!sorted.length) {
        setEventStats({})
        setSelectedEventId(null)
        return
      }

      if (selectedEventId === null) {
        setSelectedEventId(sorted[0].id)
      }

      const statsEntries = await Promise.all(
        sorted.map(async (event) => {
          try {
            const [helpersRes, activeLoansRes] = await Promise.all([
              fetch(`${API_BASE_URL}/events/${event.id}/helpers`),
              fetch(`${API_BASE_URL}/events/${event.id}/loans/active`),
            ])

            if (!helpersRes.ok || !activeLoansRes.ok) {
              throw new Error("Failed to load event stats")
            }

            const helpersJson = await helpersRes.json()
            const loansJson = await activeLoansRes.json()

            const helperCount = Array.isArray(helpersJson)
              ? helpersJson.length
              : 0
            const activeLoanCount = Array.isArray(loansJson)
              ? loansJson.length
              : 0

            return [event.id, { helperCount, activeLoanCount }] as const
          } catch {
            return [event.id, createEmptyStats()] as const
          }
        })
      )

      setEventStats(Object.fromEntries(statsEntries))
    } catch (error) {
      setEventsError(
        error instanceof Error ? error.message : "Failed to load events."
      )
    } finally {
      setEventsLoading(false)
    }
  }, [selectedEventId])

  const loadReferenceData = React.useCallback(async () => {
    setReferenceLoading(true)
    setReferenceError(null)
    try {
      const [itemsRes, personsRes, loansRes] = await Promise.all([
        fetch(`${API_BASE_URL}/items`),
        fetch(`${API_BASE_URL}/persons`),
        fetch(`${API_BASE_URL}/loans`),
      ])

      if (!itemsRes.ok) {
        throw new Error(`Failed to load items (HTTP ${itemsRes.status})`)
      }
      if (!personsRes.ok) {
        throw new Error(`Failed to load persons (HTTP ${personsRes.status})`)
      }
      if (!loansRes.ok) {
        throw new Error(`Failed to load loans (HTTP ${loansRes.status})`)
      }

      const [itemsJson, personsJson, loansJson] = await Promise.all([
        itemsRes.json(),
        personsRes.json(),
        loansRes.json(),
      ])

      const itemsData: ItemRecord[] = Array.isArray(itemsJson) ? itemsJson : []
      const personsRaw = Array.isArray(personsJson)
        ? personsJson
        : personsJson?.persons ?? personsJson?.results ?? []
      const loansData: LoanRecord[] = Array.isArray(loansJson) ? loansJson : []

      const itemsMap: Record<number, ItemRecord> = {}
      itemsData.forEach((item) => {
        itemsMap[item.id] = item
      })

      const personsMap: Record<number, NormalizedPerson> = {}
      personsRaw
        .map(normalizePerson)
        .filter(
          (person: NormalizedPerson | null): person is NormalizedPerson =>
            Boolean(person)
        )
        .forEach((person: NormalizedPerson) => {
          personsMap[person.id] = person
        })

      setItemsById(itemsMap)
      setPersonsById(personsMap)
      setAllLoans(loansData)
    } catch (error) {
      setReferenceError(
        error instanceof Error
          ? error.message
          : "Failed to load reference data."
      )
    } finally {
      setReferenceLoading(false)
    }
  }, [])

  const loadEventDetails = React.useCallback(
    async (eventId: number) => {
      setDetailLoading(true)
      setDetailError(null)
      setDetailMessage(null)
      try {
        const [helpersRes, loansRes] = await Promise.all([
          fetch(`${API_BASE_URL}/events/${eventId}/helpers`),
          fetch(`${API_BASE_URL}/events/${eventId}/loans`),
        ])

        if (!helpersRes.ok) {
          throw new Error(`Failed to load helpers (HTTP ${helpersRes.status})`)
        }
        if (!loansRes.ok) {
          throw new Error(`Failed to load loans (HTTP ${loansRes.status})`)
        }

        const helpersJson = await helpersRes.json()
        const loansJson = await loansRes.json()

        const helpersData: EventHelperRecord[] = Array.isArray(helpersJson)
          ? helpersJson
          : []
        const loansData: EventLoanRecord[] = Array.isArray(loansJson)
          ? loansJson
          : []

        setHelpers(helpersData)
        setEventLoans(loansData)
        refreshEventStats(eventId, helpersData, loansData)
      } catch (error) {
        setDetailError(
          error instanceof Error
            ? error.message
            : "Failed to load event details."
        )
        setHelpers([])
        setEventLoans([])
      } finally {
        setDetailLoading(false)
      }
    },
    [refreshEventStats]
  )

  React.useEffect(() => {
    loadEvents()
  }, [loadEvents])

  React.useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  React.useEffect(() => {
    if (selectedEventId === null) return
    loadEventDetails(selectedEventId)
  }, [selectedEventId, loadEventDetails])

  const handleCreateField = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    setCreateError(null)
  }

  const handleCreateEvent = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setCreateError(null)

    const nameValue = createForm.name.trim()
    if (!nameValue) {
      setCreateError("Event name is required.")
      return
    }

    if (!createForm.startDate || !createForm.endDate) {
      setCreateError("Start and end dates are required.")
      return
    }

    const start = parseDate(createForm.startDate)
    const end = parseDate(createForm.endDate)
    if (!start || !end) {
      setCreateError("Invalid dates provided.")
      return
    }

    if (end < start) {
      setCreateError("The end date must be after the start date.")
      return
    }

    const payload: Record<string, unknown> = {
      name: nameValue,
      start_date: createForm.startDate,
      end_date: createForm.endDate,
    }

    if (createForm.description.trim().length > 0) {
      payload.description = createForm.description.trim()
    }

    setCreateBusy(true)
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message =
          response.status === 400
            ? "Validation failed while creating the event."
            : `Failed to create event (HTTP ${response.status})`
        throw new Error(message)
      }

      const created: EventRecord = await response.json()
      await loadEvents()
      setCreateForm(createDefaultEventForm())
      setShowCreateForm(false)
      setSelectedEventId(created.id)
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create event."
      )
    } finally {
      setCreateBusy(false)
    }
  }

  const handleSelectEvent = (eventId: number) => {
    setSelectedEventId(eventId)
  }

  const searchItems = React.useCallback(
    async (query: string, limit: number) => {
      const trimmed = query.trim()
      if (!trimmed) return []

      const response = await fetch(
        `${API_BASE_URL}/items/search?name=${encodeURIComponent(trimmed)}`
      )

      if (!response.ok) {
        throw new Error(`Item search failed (HTTP ${response.status})`)
      }

      const data = await response.json()
      const items: ItemRecord[] = Array.isArray(data) ? data : []

      return items.slice(0, limit).map<ItemOption>((item) => ({
        id: item.id,
        label: item.name,
        description: item.category ?? undefined,
        item,
      }))
    },
    []
  )

  const searchPersons = React.useCallback(
    async (query: string, limit: number) => {
      const trimmed = query.trim()
      if (!trimmed) return []

      const normalizeKeySegment = (value?: string) =>
        value?.trim().toLowerCase() ?? ""

      const createPersonKey = (person: NormalizedPerson) => {
        const key = [
          normalizeKeySegment(person.firstName),
          normalizeKeySegment(person.lastName),
          normalizeKeySegment(person.slackId),
        ].join("::")
        return key === "::" ? `id:${person.id}` : key
      }

      const scorePerson = (person: NormalizedPerson) => {
        let score = 0
        if (person.firstName) score += 1
        if (person.lastName) score += 1
        if (person.slackId) score += 2
        return score
      }

      const dedupeMap = new Map<string, NormalizedPerson>()
      const upsertPerson = (person: NormalizedPerson | null) => {
        if (!person) return
        const key = createPersonKey(person)
        const existing = dedupeMap.get(key)
        if (!existing) {
          dedupeMap.set(key, person)
          return
        }

        const currentScore = scorePerson(existing)
        const incomingScore = scorePerson(person)
        if (
          incomingScore > currentScore ||
          (incomingScore === currentScore && person.id < existing.id)
        ) {
          dedupeMap.set(key, person)
        }
      }

      const searchConfigs: Array<{ key: "firstname" | "lastname"; value: string }> = [
        { key: "firstname", value: trimmed },
        { key: "lastname", value: trimmed },
      ]

      await Promise.all(
        searchConfigs.map(async ({ key, value }) => {
          const url = new URL(`${API_BASE_URL}/persons/search`)
          url.searchParams.set(key, value)

          try {
            const response = await fetch(url.toString())
            if (!response.ok) return

            const data = await response.json()
            const rawResults = Array.isArray(data)
              ? data
              : data?.persons ?? data?.results ?? []

            rawResults.map(normalizePerson).forEach(upsertPerson)
          } catch (error) {
            if (import.meta.env?.DEV) {
              console.error("Person search failed:", error)
            }
          }
        })
      )

      if (dedupeMap.size === 0) {
        const lower = trimmed.toLowerCase()
        Object.values(personsById).forEach((person) => {
          const haystack = [
            person.firstName,
            person.lastName,
            person.slackId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()

          if (haystack.includes(lower)) {
            upsertPerson(person)
          }
        })
      }

      return Array.from(dedupeMap.values())
        .slice(0, limit)
        .map<PersonOption>((person) => ({
          id: person.id,
          label: personDisplayName(person),
          description: person.slackId ?? undefined,
          person,
        }))
    },
    [personsById]
  )

  const handleAddHelper = async () => {
    if (!selectedEvent) return
    if (!selectedHelper?.person) {
      setDetailError("Please select a helper to add.")
      return
    }

    const personId = selectedHelper.person.id
    setDetailError(null)
    setDetailMessage(null)
    setHelperBusyMap((prev) => ({ ...prev, [personId]: true }))

    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${selectedEvent.id}/helpers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ person_id: personId }),
        }
      )

      if (!response.ok) {
        const message =
          response.status === 400
            ? "This person is already a helper or invalid."
            : `Failed to add helper (HTTP ${response.status})`
        throw new Error(message)
      }

      await loadEventDetails(selectedEvent.id)
      setSelectedHelper(null)
      setDetailMessage("Helper added successfully.")
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Failed to add helper."
      )
    } finally {
      setHelperBusyMap((prev) => {
        const { [personId]: _ignored, ...rest } = prev
        return rest
      })
    }
  }

  const handleRemoveHelper = async (personId: number) => {
    if (!selectedEvent) return
    setDetailError(null)
    setDetailMessage(null)
    setHelperBusyMap((prev) => ({ ...prev, [personId]: true }))

    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${selectedEvent.id}/helpers/${personId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(
          response.status === 400
            ? "Failed to remove helper due to validation."
            : `Failed to remove helper (HTTP ${response.status})`
        )
      }

      await loadEventDetails(selectedEvent.id)
      setDetailMessage("Helper removed from event.")
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Failed to remove helper."
      )
    } finally {
      setHelperBusyMap((prev) => {
        const { [personId]: _ignored, ...rest } = prev
        return rest
      })
    }
  }

  const handleLoanFieldChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target
    setLoanForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    setLoanError(null)
    setDetailError(null)
    setDetailMessage(null)
  }

  const handleCreateEventLoan = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!selectedEvent) return

    setLoanError(null)
    setDetailError(null)
    setDetailMessage(null)

    if (!loanItem?.item) {
      setLoanError("Select an item to loan.")
      return
    }

    if (!loanPerson?.person) {
      setLoanError("Select a borrower for this event.")
      return
    }

    const amountValue = Number.parseInt(loanForm.amount, 10)
    if (!Number.isInteger(amountValue) || amountValue <= 0) {
      setLoanError("Amount must be a positive integer.")
      return
    }

    setLoanSubmitting(true)
    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${selectedEvent.id}/loans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_id: loanItem.item.id,
            person_id: loanPerson.person.id,
            amount: amountValue,
          }),
        }
      )

      if (!response.ok) {
        const message =
          response.status === 400
            ? "Validation failed while creating the loan."
            : `Failed to create event loan (HTTP ${response.status})`
        throw new Error(message)
      }

      setLoanItem(null)
      setLoanPerson(null)
      setLoanForm(createDefaultLoanForm())
      await loadEventDetails(selectedEvent.id)
      setDetailMessage("Event loan created.")
    } catch (error) {
      setLoanError(
        error instanceof Error ? error.message : "Failed to create event loan."
      )
    } finally {
      setLoanSubmitting(false)
    }
  }

  const handleAttachExistingLoan = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!selectedEvent) return

    setDetailError(null)
    setDetailMessage(null)

    if (existingLoanId === "") {
      setDetailError("Select an existing borrow to attach.")
      return
    }

    const loanIdToAttach = Number(existingLoanId)
    if (!Number.isFinite(loanIdToAttach)) {
      setDetailError("Invalid borrow selected.")
      return
    }

    const loan = allLoans.find((entry) => entry.id === loanIdToAttach)
    if (!loan) {
      setDetailError("Unable to locate the selected borrow.")
      return
    }

    setExistingLoanBusy(true)
    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${selectedEvent.id}/loans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_id: loan.item_id,
            person_id: loan.person_id,
            amount: loan.amount,
          }),
        }
      )

      if (!response.ok) {
        const message =
          response.status === 400
            ? "Failed to attach borrow due to validation."
            : `Failed to attach borrow (HTTP ${response.status})`
        throw new Error(message)
      }

      setExistingLoanId("")
      await loadEventDetails(selectedEvent.id)
      setDetailMessage("Borrow attached to the event.")
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Failed to attach borrow."
      )
    } finally {
      setExistingLoanBusy(false)
    }
  }

  const handleReturnLoan = async (loanId: number) => {
    if (!selectedEvent) return
    setDetailError(null)
    setDetailMessage(null)
    setLoanActionBusyMap((prev) => ({ ...prev, [loanId]: true }))

    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${selectedEvent.id}/loans/${loanId}/return`,
        {
          method: "POST",
        }
      )

      if (!response.ok) {
        throw new Error(
          response.status === 400
            ? "Failed to mark loan as returned."
            : `Failed to return loan (HTTP ${response.status})`
        )
      }

      await loadEventDetails(selectedEvent.id)
      setDetailMessage("Loan marked as returned.")
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Failed to return loan."
      )
    } finally {
      setLoanActionBusyMap((prev) => {
        const { [loanId]: _ignored, ...rest } = prev
        return rest
      })
    }
  }

  const handleReturnAll = async () => {
    if (!selectedEvent) return
    setDetailError(null)
    setDetailMessage(null)
    setLoanSubmitting(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${selectedEvent.id}/loans/return-all`,
        {
          method: "POST",
        }
      )

      if (!response.ok) {
        throw new Error(
          response.status === 400
            ? "Failed to return all loans due to validation."
            : `Failed to return all loans (HTTP ${response.status})`
        )
      }

      await loadEventDetails(selectedEvent.id)
      setDetailMessage("All event loans returned.")
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Failed to return all event loans."
      )
    } finally {
      setLoanSubmitting(false)
    }
  }

  const eventLoanColumns = React.useMemo<ColumnDef<EventLoanView>[]>(
    () => [
      {
        header: "Item",
        accessorKey: "item",
        cell: ({ row }) =>
          row.original.item?.name ?? `Item #${row.original.item_id}`,
      },
      {
        header: "Borrower",
        accessorKey: "person",
        cell: ({ row }) =>
          row.original.person
            ? personDisplayName(row.original.person)
            : `Person #${row.original.person_id}`,
      },
      {
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) => row.original.amount,
      },
      {
        header: "Borrowed",
        accessorKey: "borrowed_at",
        cell: ({ row }) => formatDateTime(row.original.borrowed_at),
      },
      {
        header: "Returned",
        accessorKey: "returned_at",
        cell: ({ row }) => formatDateTime(row.original.returned_at),
      },
      {
        header: "Actions",
        accessorKey: "actions",
        cell: ({ row }) => {
          const loan = row.original
          const disabled = Boolean(loan.returned_at) || loanActionBusyMap[loan.id]
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => handleReturnLoan(loan.id)}
            >
              {loanActionBusyMap[loan.id] ? "Returning…" : "Return"}
            </Button>
          )
        },
      },
    ],
    [loanActionBusyMap]
  )

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Event Manager</h1>
        <p className="text-sm text-muted-foreground">
          Monitor upcoming activities, assign helpers, and track event-specific
          borrowing from the Lagertool API in one dashboard.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Total events
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.totalEvents}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            All events tracked in the system.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Active now
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.activeEvents}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Events happening today.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Upcoming
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.upcomingEvents}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Events scheduled for the future.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Active loans
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.activeLoans}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Items currently borrowed for events.
          </p>
        </article>
      </section>

      {eventsError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          {eventsError}
        </p>
      ) : null}

      {referenceError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          {referenceError}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Events</h2>
              <p className="text-sm text-muted-foreground">
                Select an event to manage helpers and borrowing.
              </p>
            </div>
            <Button onClick={() => setShowCreateForm((prev) => !prev)}>
              {showCreateForm ? "Close form" : "New event"}
            </Button>
          </div>

          {showCreateForm ? (
            <form
              className="space-y-4 rounded-lg border bg-card px-5 py-5 shadow-sm"
              onSubmit={handleCreateEvent}
            >
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Event name *
                </label>
                <input
                  name="name"
                  type="text"
                  value={createForm.name}
                  onChange={handleCreateField}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateField}
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Start date *
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={createForm.startDate}
                    onChange={handleCreateField}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    End date *
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    value={createForm.endDate}
                    onChange={handleCreateField}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
              </div>
              {createError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {createError}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreateForm(createDefaultEventForm())
                    setCreateError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createBusy}>
                  {createBusy ? "Creating…" : "Create event"}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3">
            {eventsLoading ? (
              <p className="text-sm text-muted-foreground">Loading events…</p>
            ) : events.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                No events yet. Create your first event to get started.
              </p>
            ) : (
              events.map((event) => {
                const stats = eventStats[event.id] ?? createEmptyStats()
                const category = categorizeEvent(event)
                const isSelected = event.id === selectedEventId
                return (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event.id)}
                    className={`flex w-full flex-col items-start rounded-lg border px-4 py-3 text-left shadow-sm transition hover:border-primary hover:shadow ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">{event.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          category === "active"
                            ? "bg-green-100 text-green-700"
                            : category === "upcoming"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {category.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.description?.trim() || "No description provided."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>{getEventDurationLabel(event)}</span>
                      <span>Helpers: {stats.helperCount}</span>
                      <span>Active loans: {stats.activeLoanCount}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border bg-card px-5 py-6 shadow-sm">
            {selectedEvent ? (
              <>
                <header className="space-y-1">
                  <h2 className="text-xl font-semibold">{selectedEvent.name}</h2>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Event overview
                  </p>
                </header>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div>
                    <dt className="font-medium text-foreground">Dates</dt>
                    <dd className="text-muted-foreground">
                      {getEventDurationLabel(selectedEvent)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Description</dt>
                    <dd className="text-muted-foreground">
                      {selectedEvent.description?.trim() || "No description on record."}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Created at</dt>
                    <dd className="text-muted-foreground">
                      {formatDateTime(selectedEvent.created_at)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select an event to see more details and manage helpers or loans.
              </p>
            )}
          </div>

          {detailError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
              {detailError}
            </p>
          ) : null}
          {detailMessage ? (
            <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600">
              {detailMessage}
            </p>
          ) : null}

          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading event details…</p>
          ) : null}

          {selectedEvent ? (
            <div className="space-y-6">
              <section className="space-y-4 rounded-lg border bg-card px-5 py-5 shadow-sm">
                <header>
                  <h3 className="text-lg font-semibold">Helpers</h3>
                  <p className="text-xs text-muted-foreground">
                    Add or remove helpers who can manage loans for this event.
                  </p>
                </header>
                <div className="space-y-3">
                  <RestrictedSearch
                    placeholder="Search for a person…"
                    onSelect={(option) => setSelectedHelper(option as PersonOption)}
                    searchFn={searchPersons}
                    selectedLabel={selectedHelper?.label}
                    minChars={2}
                    renderItem={(option) => {
                      const { person } = option as PersonOption
                      return (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {personDisplayName(person)}
                          </span>
                          {person.slackId ? (
                            <span className="text-xs text-muted-foreground">
                              Slack: {person.slackId}
                            </span>
                          ) : null}
                        </div>
                      )
                    }}
                  />
                  <Button
                    className="w-full"
                    onClick={handleAddHelper}
                    disabled={
                      !selectedHelper?.person ||
                      Boolean(selectedHelper?.person && helperBusyMap[selectedHelper.person.id])
                    }
                  >
                    {selectedHelper?.person && helperBusyMap[selectedHelper.person.id]
                      ? "Adding helper…"
                      : "Add helper"}
                  </Button>
                </div>
                <ul className="space-y-2">
                  {helperViews.length === 0 ? (
                    <li className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                      No helpers assigned yet.
                    </li>
                  ) : (
                    helperViews.map((helper) => (
                      <li
                        key={helper.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {helper.person
                              ? personDisplayName(helper.person)
                              : `Person #${helper.person_id}`}
                          </span>
                          {helper.person?.slackId ? (
                            <span className="text-xs text-muted-foreground">
                              Slack: {helper.person.slackId}
                            </span>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(helperBusyMap[helper.person_id])}
                          onClick={() => handleRemoveHelper(helper.person_id)}
                        >
                          {helperBusyMap[helper.person_id] ? "Removing…" : "Remove"}
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section className="space-y-4 rounded-lg border bg-card px-5 py-5 shadow-sm">
                <header>
                  <h3 className="text-lg font-semibold">Create Event Loan</h3>
                  <p className="text-xs text-muted-foreground">
                    Record a new borrow that belongs exclusively to this event.
                  </p>
                </header>
                <form className="space-y-4" onSubmit={handleCreateEventLoan}>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Item *
                    </label>
                    <RestrictedSearch
                      placeholder="Search for an item…"
                      onSelect={(option) => setLoanItem(option as ItemOption)}
                      searchFn={searchItems}
                      selectedLabel={loanItem?.label}
                      minChars={1}
                      renderItem={(option) => {
                        const { item } = option as ItemOption
                        return (
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            {item.category ? (
                              <span className="text-xs text-muted-foreground">
                                Category: {item.category}
                              </span>
                            ) : null}
                          </div>
                        )
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Borrower *
                    </label>
                    <RestrictedSearch
                      placeholder="Search for a person…"
                      onSelect={(option) => setLoanPerson(option as PersonOption)}
                      searchFn={searchPersons}
                      selectedLabel={loanPerson?.label}
                      minChars={2}
                      renderItem={(option) => {
                        const { person } = option as PersonOption
                        return (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {personDisplayName(person)}
                            </span>
                            {person.slackId ? (
                              <span className="text-xs text-muted-foreground">
                                Slack: {person.slackId}
                              </span>
                            ) : null}
                          </div>
                        )
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Amount *
                    </label>
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      step="1"
                      value={loanForm.amount}
                      onChange={handleLoanFieldChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                  </div>
                  {loanError ? (
                    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                      {loanError}
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={loanSubmitting}>
                    {loanSubmitting ? "Submitting…" : "Create loan"}
                  </Button>
                </form>
              </section>

              <section className="space-y-4 rounded-lg border bg-card px-5 py-5 shadow-sm">
                <header>
                  <h3 className="text-lg font-semibold">Attach Existing Borrow</h3>
                  <p className="text-xs text-muted-foreground">
                    Link an existing borrow to this event without recreating it.
                  </p>
                </header>
                <form className="space-y-3" onSubmit={handleAttachExistingLoan}>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    value={existingLoanId}
                    onChange={(event) => {
                      const value = event.target.value
                      setExistingLoanId(value === "" ? "" : Number(value))
                    }}
                  >
                    <option value="">Select a borrow…</option>
                    {existingLoanOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={existingLoanBusy || existingLoanId === ""}
                  >
                    {existingLoanBusy ? "Attaching…" : "Attach borrow"}
                  </Button>
                </form>
              </section>

              <section className="space-y-4 rounded-lg border bg-card px-5 py-5 shadow-sm">
                <header className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Event Loans</h3>
                    <p className="text-xs text-muted-foreground">
                      Track all items loaned for this event and mark returns.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReturnAll}
                    disabled={loanSubmitting}
                  >
                    {loanSubmitting ? "Processing…" : "Return all"}
                  </Button>
                </header>
                <DataTable columns={eventLoanColumns} data={eventLoanViews} />
              </section>
            </div>
          ) : null}
        </aside>
      </section>

      {(eventsLoading || referenceLoading) && (
        <p className="text-xs text-muted-foreground">
          Background data is still loading…
        </p>
      )}
    </div>
  )
}
