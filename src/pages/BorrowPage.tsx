"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import RestrictedSearch, {
  type RestrictedSearchItem,
} from "@/components/RestrictedSearch"
import PersonLink from "@/components/PersonLink"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  const summary = React.useMemo(() => {
    const now = Date.now()
    let overdueCount = 0
    let dueSoonCount = 0
    let totalItems = 0
    const borrowers = new Set<number>()

    for (const loan of loans) {
      totalItems += loan.amount ?? 0
      borrowers.add(loan.person_id)

      if (!loan.until) {
        continue
      }

      const due = new Date(loan.until).getTime()
      if (Number.isNaN(due)) {
        continue
      }

      if (due < now) {
        overdueCount += 1
      } else if (due - now <= 3 * 24 * 60 * 60 * 1000) {
        dueSoonCount += 1
      }
    }

    return {
      totalLoans: loans.length,
      totalItems,
      uniqueBorrowers: borrowers.size,
      overdueCount,
      dueSoonCount,
    }
  }, [loans])

  return (
    <div className="container mx-auto max-w-6xl space-y-10 py-10 px-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Borrow Items</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage active loans using the Lagertool API. Select an item,
            choose a borrower, and set the borrowing period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={fetchAllData}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Refreshing
              </>
            ) : (
              "Refresh data"
            )}
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="border-destructive/50 text-destructive flex flex-col gap-1 rounded-lg border bg-destructive/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
          <span className="font-medium">Unable to load borrow data.</span>
          <span className="text-destructive/80 sm:flex-1">{loadError}</span>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Active loans
            </p>
            <p className="mt-3 text-3xl font-semibold">{summary.totalLoans}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.overdueCount} overdue right now.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Items out
            </p>
            <p className="mt-3 text-3xl font-semibold">{summary.totalItems}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total quantity currently on loan.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Due soon
            </p>
            <p className="mt-3 text-3xl font-semibold">{summary.dueSoonCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Due within the next 3 days.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Borrowers
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {summary.uniqueBorrowers}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unique people with outstanding loans.
            </p>
          </CardContent>
        </Card>
      </section>

      <form onSubmit={handleCreateLoan} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create a loan</CardTitle>
            <CardDescription>
              Search for an item and borrower, then set the borrowing period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldSet className="space-y-6">
              <FieldGroup className="gap-6 md:grid md:grid-cols-2">
                <Field>
                  <FieldTitle>
                    Item <span className="text-destructive">*</span>
                  </FieldTitle>
                  <FieldContent>
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
                    <FieldDescription>
                      {selectedItem?.item
                        ? renderItemDetails(selectedItem.item)
                        : "Pick an item to loan."}
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldTitle>
                    Borrower <span className="text-destructive">*</span>
                  </FieldTitle>
                  <FieldContent>
                    <RestrictedSearch
                      placeholder="Search for a person…"
                      onSelect={(option) => setSelectedPerson(option as PersonOption)}
                      searchFn={searchPersons}
                      selectedLabel={selectedPerson?.label}
                      minChars={0}
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
                    <FieldDescription>
                      {selectedPerson?.person
                        ? selectedPerson.person.slackId
                          ? `${personDisplayName(selectedPerson.person)} · Slack: ${selectedPerson.person.slackId}`
                          : personDisplayName(selectedPerson.person)
                        : "Pick a borrower to continue."}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>

              <FieldGroup className="gap-6 md:grid md:grid-cols-3">
                <Field>
                  <FieldTitle>Amount *</FieldTitle>
                  <FieldContent>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min={1}
                      step={1}
                      value={loanForm.amount}
                      onChange={handleLoanFieldChange}
                      className="md:w-28"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldTitle>Start date *</FieldTitle>
                  <FieldContent>
                    <Input
                      id="begin"
                      name="begin"
                      type="datetime-local"
                      value={loanForm.begin}
                      onChange={handleLoanFieldChange}
                    />
                    <FieldDescription>Local timezone.</FieldDescription>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldTitle>Due date *</FieldTitle>
                  <FieldContent>
                    <Input
                      id="until"
                      name="until"
                      type="datetime-local"
                      value={loanForm.until}
                      onChange={handleLoanFieldChange}
                    />
                    <FieldDescription>
                      Must be after the start date.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>

            {submitError ? (
              <div className="border-destructive/50 text-destructive flex items-start gap-3 rounded-lg border bg-destructive/10 px-4 py-3 text-sm">
                {submitError}
              </div>
            ) : null}

            {submitSuccess ? (
              <div className="border-emerald-400/40 text-emerald-700 flex items-start gap-3 rounded-lg border bg-emerald-500/10 px-4 py-3 text-sm">
                {submitSuccess}
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetLoanForm}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving
                </>
              ) : (
                "Create loan"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Active loans</CardTitle>
            <CardDescription>
              Manage open loans, update due dates, or mark items as returned.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Refreshing…
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fetchAllData}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-6 py-3">Item</TableHead>
                <TableHead className="px-6 py-3">Borrower</TableHead>
                <TableHead className="px-6 py-3 text-center">Amount</TableHead>
                <TableHead className="px-6 py-3">Period</TableHead>
                <TableHead className="px-6 py-3 text-center">Status</TableHead>
                <TableHead className="px-6 py-3 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="px-6 py-10 text-center text-sm text-muted-foreground"
                    colSpan={6}
                  >
                    No active loans.
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => {
                  const rowState = getRowState(loan.id)
                  const isEditing = editingLoanId === loan.id && loanEditBuffer
                  const borrower = loan.person ?? personsById[loan.person_id]
                  const dueTime = loan.until
                    ? new Date(loan.until).getTime()
                    : Number.NaN
                  const overdue = Number.isFinite(dueTime) && dueTime < Date.now()
                  const dueSoon =
                    Number.isFinite(dueTime) &&
                    !overdue &&
                    dueTime - Date.now() <= 2 * 24 * 60 * 60 * 1000
                  const statusLabel = overdue
                    ? "Overdue"
                    : dueSoon
                    ? "Due soon"
                    : "On schedule"
                  const statusClass = overdue
                    ? "bg-red-100 text-red-700"
                    : dueSoon
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                  const item = loan.item ?? itemsById[loan.item_id]
                  return (
                    <TableRow
                      key={loan.id}
                      className={
                        overdue
                          ? "text-red-700"
                          : dueSoon
                          ? "text-amber-700"
                          : undefined
                      }
                    >
                      <TableCell className="px-6 py-4 align-top text-sm">
                        <div className="space-y-1">
                          <Link
                            to={`/items/${loan.item_id}`}
                            className="font-medium leading-tight text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {item?.name ?? `Item #${loan.item_id}`}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {item?.category
                              ? `Category: ${item.category}`
                              : `Item ID: ${loan.item_id}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-sm">
                        <div className="space-y-1">
                          <PersonLink
                            personId={loan.person_id}
                            person={borrower}
                            className="font-medium leading-tight"
                          />
                          <div className="text-xs text-muted-foreground">
                            Person ID: {loan.person_id}
                          </div>
                          {borrower?.slackId ? (
                            <div className="text-xs text-muted-foreground">
                              Slack: {borrower.slackId}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-center text-sm font-semibold">
                        {isEditing && loanEditBuffer ? (
                          <Input
                            type="number"
                            name="amount"
                            min={1}
                            step={1}
                            value={loanEditBuffer.amount}
                            onChange={handleLoanEditChange}
                            className="ml-auto h-9 w-24"
                          />
                        ) : (
                          loan.amount
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-sm">
                        {isEditing && loanEditBuffer ? (
                          <div className="grid gap-2">
                            <Input
                              type="datetime-local"
                              name="begin"
                              value={loanEditBuffer.begin}
                              onChange={handleLoanEditChange}
                            />
                            <Input
                              type="datetime-local"
                              name="until"
                              value={loanEditBuffer.until}
                              onChange={handleLoanEditChange}
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatDateTime(loan.begin)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Due {formatDateTime(loan.until)}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-center text-sm">
                        <span
                          className={`inline-flex items-center justify-end rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-center">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isEditing && loanEditBuffer ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleUpdateLoan(loan)}
                                disabled={rowState === "updating"}
                              >
                                {rowState === "updating" ? (
                                  <>
                                    <Loader2
                                      className="size-4 animate-spin"
                                      aria-hidden="true"
                                    />
                                    Saving…
                                  </>
                                ) : (
                                  "Save changes"
                                )}
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
                                {rowState === "returning" ? (
                                  <>
                                    <Loader2
                                      className="size-4 animate-spin"
                                      aria-hidden="true"
                                    />
                                    Marking…
                                  </>
                                ) : (
                                  "Mark returned"
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
