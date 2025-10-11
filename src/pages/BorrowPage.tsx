"use client"

import * as React from "react"
import RestrictedSearch, {
  type RestrictedSearchItem,
} from "@/components/RestrictedSearch"
import { Button } from "@/components/ui/button"
import PersonLink from "@/components/PersonLink"
import {
  normalizePerson,
  personDisplayName,
  type NormalizedPerson,
} from "@/lib/person"

type LoanRecord = {
  id: number
  item_id: number
  person_id: number
  amount: number
  begin: string
  until: string
  returned?: boolean | null
  returned_at?: string | null
}

type ItemRecord = {
  id: number
  name: string
  category?: string | null
}

type CombinedLoan = LoanRecord & {
  item?: ItemRecord
  person?: NormalizedPerson
}

type LoanFormState = {
  amount: string
  begin: string
  until: string
}

type ItemOption = RestrictedSearchItem & { item: ItemRecord }
type PersonOption = RestrictedSearchItem & { person: NormalizedPerson }

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const pad = (value: number) => value.toString().padStart(2, "0")

const toLocalInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`

const createDefaultLoanForm = (): LoanFormState => {
  const now = new Date()
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    amount: "1",
    begin: toLocalInputValue(now),
    until: toLocalInputValue(oneWeekLater),
  }
}

const fromIsoToLocalInput = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return toLocalInputValue(date)
}

const formatDateTime = (isoString?: string) => {
  if (!isoString) {
    return "—"
  }
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function BorrowPage() {
  const [loanForm, setLoanForm] = React.useState<LoanFormState>(
    createDefaultLoanForm
  )
  const [selectedItem, setSelectedItem] = React.useState<ItemOption | null>(null)
  const [selectedPerson, setSelectedPerson] =
    React.useState<PersonOption | null>(null)

  const [loans, setLoans] = React.useState<CombinedLoan[]>([])
  const [itemsById, setItemsById] = React.useState<Record<number, ItemRecord>>(
    {}
  )
  const [personsById, setPersonsById] = React.useState<
    Record<number, NormalizedPerson>
  >({})

  const [loading, setLoading] = React.useState<boolean>(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [editingLoanId, setEditingLoanId] = React.useState<number | null>(null)
  const [loanEditBuffer, setLoanEditBuffer] = React.useState<LoanFormState | null>(
    null
  )
  const [rowStates, setRowStates] = React.useState<
    Record<number, "updating" | "returning">
  >({})

  const setRowState = React.useCallback(
    (id: number, state: "updating" | "returning") => {
      setRowStates((prev) => ({ ...prev, [id]: state }))
    },
    []
  )

  const clearRowState = React.useCallback((id: number) => {
    setRowStates((prev) => {
      const { [id]: _ignored, ...rest } = prev
      return rest
    })
  }, [])

  const getRowState = React.useCallback(
    (id: number) => rowStates[id],
    [rowStates]
  )

  const fetchAllData = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [loansRes, itemsRes, personsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/loans`),
        fetch(`${API_BASE_URL}/items`),
        fetch(`${API_BASE_URL}/persons`),
      ])

      if (!loansRes.ok) {
        throw new Error(`Failed to load loans (HTTP ${loansRes.status})`)
      }
      if (!itemsRes.ok) {
        throw new Error(`Failed to load items (HTTP ${itemsRes.status})`)
      }
      if (!personsRes.ok) {
        throw new Error(`Failed to load persons (HTTP ${personsRes.status})`)
      }

      const loansJson = await loansRes.json()
      const itemsJson = await itemsRes.json()
      const personsJson = await personsRes.json()

      const loanData: LoanRecord[] = Array.isArray(loansJson) ? loansJson : []
      const itemData: ItemRecord[] = Array.isArray(itemsJson) ? itemsJson : []
      const personDataRaw = Array.isArray(personsJson)
        ? personsJson
        : personsJson?.persons ?? personsJson?.results ?? []

      const itemsMap: Record<number, ItemRecord> = {}
      itemData.forEach((item) => {
        itemsMap[item.id] = item
      })

      const normalizedPersons = (Array.isArray(personDataRaw)
        ? personDataRaw
        : []
      )
        .map(normalizePerson)
        .filter((person): person is NormalizedPerson => Boolean(person))

      const personsMap: Record<number, NormalizedPerson> = {}
      normalizedPersons.forEach((person) => {
        personsMap[person.id] = person
      })

      const merged = loanData
        .map<CombinedLoan>((loan) => ({
          ...loan,
          item: itemsMap[loan.item_id],
          person: personsMap[loan.person_id],
        }))
        .sort((a, b) => {
          const aTime = new Date(a.until).getTime()
          const bTime = new Date(b.until).getTime()
          if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
          if (Number.isNaN(aTime)) return 1
          if (Number.isNaN(bTime)) return -1
          return aTime - bTime
        })

      const activeLoans = merged.filter((loan) => !loan.returned)

      setLoans(activeLoans)
      setItemsById(itemsMap)
      setPersonsById(personsMap)
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load loan data."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleLoanFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target
    setLoanForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const handleLoanEditChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!loanEditBuffer) return
    const { name, value } = event.target
    setLoanEditBuffer((prev) => (prev ? { ...prev, [name]: value } : prev))
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const resetLoanForm = () => {
    setLoanForm(createDefaultLoanForm())
    setSelectedItem(null)
    setSelectedPerson(null)
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const searchItems = React.useCallback(
    async (query: string, limit: number) => {
      const trimmed = query.trim()
      if (!trimmed) {
        return []
      }

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
      if (!trimmed) {
        return []
      }

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

      const searchConfigs: Array<{
        key: "firstname" | "lastname"
        value: string
      }> = [
        { key: "firstname", value: trimmed },
        { key: "lastname", value: trimmed },
      ]

      await Promise.all(
        searchConfigs.map(async ({ key, value }) => {
          const url = new URL(`${API_BASE_URL}/persons/search`)
          url.searchParams.set(key, value)

          try {
            const response = await fetch(url.toString())
            if (!response.ok) {
              return
            }
            const data = await response.json()
            const rawResults = Array.isArray(data)
              ? data
              : data?.persons ?? data?.results ?? []

            rawResults.map(normalizePerson).forEach(upsertPerson)
          } catch (error) {
            if (import.meta.env.DEV) {
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

  const handleCreateLoan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!selectedItem?.item) {
      setSubmitError("Please select an item to loan.")
      return
    }

    if (!selectedPerson?.person) {
      setSubmitError("Please select a borrower.")
      return
    }

    const amountValue = Number.parseInt(loanForm.amount, 10)
    if (!Number.isInteger(amountValue) || amountValue <= 0) {
      setSubmitError("Amount must be a positive integer.")
      return
    }

    const beginDate = new Date(loanForm.begin)
    const untilDate = new Date(loanForm.until)

    if (Number.isNaN(beginDate.getTime())) {
      setSubmitError("Please provide a valid start date and time.")
      return
    }

    if (Number.isNaN(untilDate.getTime())) {
      setSubmitError("Please provide a valid due date and time.")
      return
    }

    if (beginDate >= untilDate) {
      setSubmitError("The due date must be after the start date.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: selectedItem.item.id,
          person_id: selectedPerson.person.id,
          amount: amountValue,
          begin: beginDate.toISOString(),
          until: untilDate.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create loan (HTTP ${response.status})`)
      }

      await fetchAllData()
      setSubmitSuccess("Loan created successfully.")
      resetLoanForm()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create loan."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditingLoan = (loan: CombinedLoan) => {
    setEditingLoanId(loan.id)
    setLoanEditBuffer({
      amount: String(loan.amount),
      begin: fromIsoToLocalInput(loan.begin),
      until: fromIsoToLocalInput(loan.until),
    })
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const cancelEditingLoan = () => {
    setEditingLoanId(null)
    setLoanEditBuffer(null)
  }

  const handleUpdateLoan = async (loan: CombinedLoan) => {
    if (!loanEditBuffer) return

    const amountValue = Number.parseInt(loanEditBuffer.amount, 10)
    if (!Number.isInteger(amountValue) || amountValue <= 0) {
      setSubmitError("Amount must be a positive integer.")
      return
    }

    const beginDate = new Date(loanEditBuffer.begin)
    const untilDate = new Date(loanEditBuffer.until)

    if (Number.isNaN(beginDate.getTime())) {
      setSubmitError("Start date is invalid.")
      return
    }

    if (Number.isNaN(untilDate.getTime())) {
      setSubmitError("Due date is invalid.")
      return
    }

    if (beginDate >= untilDate) {
      setSubmitError("Due date must be after start date.")
      return
    }

    setRowState(loan.id, "updating")

    try {
      const response = await fetch(`${API_BASE_URL}/loans/${loan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: loan.item_id,
          person_id: loan.person_id,
          amount: amountValue,
          begin: beginDate.toISOString(),
          until: untilDate.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update loan (HTTP ${response.status})`)
      }

      await fetchAllData()
      setSubmitSuccess("Loan updated.")
      cancelEditingLoan()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update loan."
      )
    } finally {
      clearRowState(loan.id)
    }
  }

  const handleReturnLoan = async (loanId: number) => {
    if (!window.confirm("Mark this loan as returned?")) {
      return
    }
    setRowState(loanId, "returning")
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}/return`, {
        method: "PATCH",
      })

      if (!response.ok) {
        throw new Error(`Failed to mark loan as returned (HTTP ${response.status})`)
      }

      setLoans((prev) => prev.filter((loan) => loan.id !== loanId))
      setSubmitSuccess("Loan marked as returned.")
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to mark loan as returned."
      )
    } finally {
      clearRowState(loanId)
    }
  }

  const renderItemDetails = (item?: ItemRecord) => {
    if (!item) return "Unknown item"
    return item.category ? `${item.name} · ${item.category}` : item.name
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Borrow Items</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create and manage active loans using the Lagertool API. Select an item,
          choose a borrower, and pick the borrowing period.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          {loadError}
        </p>
      ) : null}

      <form
        className="space-y-6 rounded-lg border bg-card px-6 py-6 shadow-sm"
        onSubmit={handleCreateLoan}
      >
        <fieldset className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Item *
            </label>
            <RestrictedSearch
              placeholder="Search for an item…"
              onSelect={(option) => setSelectedItem(option as ItemOption)}
              searchFn={searchItems}
              selectedLabel={selectedItem?.label}
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
            <div className="text-xs text-muted-foreground">
              {selectedItem?.item
                ? renderItemDetails(selectedItem.item)
                : "Pick an item to loan."}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Borrower *
            </label>
            <RestrictedSearch
              placeholder="Search for a person…"
              onSelect={(option) => setSelectedPerson(option as PersonOption)}
              searchFn={searchPersons}
              selectedLabel={selectedPerson?.label}
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
            <div className="text-xs text-muted-foreground">
              {selectedPerson?.person
                ? selectedPerson.person.slackId
                  ? `${personDisplayName(selectedPerson.person)} · Slack: ${selectedPerson.person.slackId}`
                  : personDisplayName(selectedPerson.person)
                : "Pick a borrower to continue."}
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="amount"
            >
              Amount *
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              value={loanForm.amount}
              onChange={handleLoanFieldChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2" />

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="begin"
            >
              Start date *
            </label>
            <input
              id="begin"
              name="begin"
              type="datetime-local"
              value={loanForm.begin}
              onChange={handleLoanFieldChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="until"
            >
              Due date *
            </label>
            <input
              id="until"
              name="until"
              type="datetime-local"
              value={loanForm.until}
              onChange={handleLoanFieldChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>
        </fieldset>

        {submitError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
            {submitError}
          </p>
        ) : null}

        {submitSuccess ? (
          <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600">
            {submitSuccess}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetLoanForm}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Create loan"}
          </Button>
        </div>
      </form>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-medium">Active loans</h2>
            <p className="text-xs text-muted-foreground">
              Manage open loans, update due dates, or mark items as returned.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {loading ? <span>Refreshing…</span> : null}
            <Button variant="secondary" size="sm" onClick={fetchAllData}>
              Refresh
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium">Borrower</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Period</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loans.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                  >
                    No active loans.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const rowState = getRowState(loan.id)
                  const isEditing = editingLoanId === loan.id && loanEditBuffer
                  const overdue =
                    loan.until && new Date(loan.until).getTime() < Date.now()
                  const borrower = loan.person ?? personsById[loan.person_id]

                  return (
                    <tr
                      key={loan.id}
                      className={overdue ? "bg-red-50/60 text-red-900" : ""}
                    >
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">
                          {renderItemDetails(loan.item ?? itemsById[loan.item_id])}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {loan.item_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <PersonLink
                          personId={loan.person_id}
                          person={borrower}
                          className="font-medium"
                        />
                        <div className="text-xs text-muted-foreground">
                          ID: {loan.person_id}
                        </div>
                        {borrower?.slackId ? (
                          <div className="text-xs text-muted-foreground">
                            Slack: {borrower.slackId}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={loanEditBuffer.amount}
                            name="amount"
                            onChange={handleLoanEditChange}
                            className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          loan.amount
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {isEditing ? (
                          <div className="grid gap-2">
                            <input
                              type="datetime-local"
                              name="begin"
                              value={loanEditBuffer.begin}
                              onChange={handleLoanEditChange}
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="datetime-local"
                              name="until"
                              value={loanEditBuffer.until}
                              onChange={handleLoanEditChange}
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span>{formatDateTime(loan.begin)}</span>
                            <span>{formatDateTime(loan.until)}</span>
                            {overdue ? (
                              <span className="mt-1 text-xs font-medium uppercase tracking-wide text-red-600">
                                Overdue
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleUpdateLoan(loan)}
                                disabled={rowState === "updating"}
                              >
                                {rowState === "updating" ? "Saving…" : "Save"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelEditingLoan}
                                disabled={rowState === "updating"}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingLoan(loan)}
                                disabled={rowState === "returning"}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleReturnLoan(loan.id)}
                                disabled={rowState === "returning"}
                              >
                                {rowState === "returning" ? "Marking…" : "Mark returned"}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
