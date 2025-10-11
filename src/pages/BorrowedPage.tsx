"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { CalendarDays, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import PersonLink from "@/components/PersonLink"
import { normalizePerson, type NormalizedPerson } from "@/lib/person"
import { downloadFile } from "@/lib/download"

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

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const formatDateTime = (iso?: string) => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function BorrowedPage() {
  const [loans, setLoans] = React.useState<CombinedLoan[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [downloadingCalendar, setDownloadingCalendar] = React.useState<boolean>(false)
  const [downloadingLoanId, setDownloadingLoanId] = React.useState<number | null>(null)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
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

      const itemMap = new Map(itemData.map((item) => [item.id, item]))
      const normalizedPersons = (Array.isArray(personDataRaw)
        ? personDataRaw
        : []
      )
        .map(normalizePerson)
        .filter((person): person is NormalizedPerson => Boolean(person))
      const personMap = new Map(
        normalizedPersons.map((person) => [person.id, person])
      )

      const combined = loanData
        .map<CombinedLoan>((loan) => ({
          ...loan,
          item: itemMap.get(loan.item_id),
          person: personMap.get(loan.person_id),
        }))
        .sort((a, b) => {
          const aTime = new Date(a.until).getTime()
          const bTime = new Date(b.until).getTime()
          if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
          if (Number.isNaN(aTime)) return 1
          if (Number.isNaN(bTime)) return -1
          return aTime - bTime
        })

      const activeLoans = combined.filter((loan) => !loan.returned)

      setLoans(activeLoans)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to load loans."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDownloadLoansCalendar = React.useCallback(async () => {
    try {
      setDownloadingCalendar(true)
      await downloadFile(`${API_BASE_URL}/calendar/loans`, "active-loans.ics")
    } catch (caught) {
      console.error(caught)
      window.alert("Unable to download the loans calendar. Please try again.")
    } finally {
      setDownloadingCalendar(false)
    }
  }, [])

  const handleDownloadSingleLoan = React.useCallback(async (loanId: number) => {
    try {
      setDownloadingLoanId(loanId)
      await downloadFile(`${API_BASE_URL}/calendar/${loanId}`, `loan-${loanId}.ics`)
    } catch (caught) {
      console.error(caught)
      window.alert("Unable to download this loan calendar. Please try again.")
    } finally {
      setDownloadingLoanId((current) => (current === loanId ? null : current))
    }
  }, [])

  const summary = React.useMemo(() => {
    const now = Date.now()
    const overdue = loans.filter(
      (loan) => loan.until && new Date(loan.until).getTime() < now
    )
    const dueSoon = loans.filter((loan) => {
      if (!loan.until) return false
      const due = new Date(loan.until).getTime()
      if (Number.isNaN(due)) return false
      const diff = due - now
      return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
    })
    const uniqueBorrowers = new Set(loans.map((loan) => loan.person_id)).size
    const totalItems = loans.reduce((acc, loan) => acc + (loan.amount ?? 0), 0)

    return {
      totalLoans: loans.length,
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      uniqueBorrowers,
      totalItems,
    }
  }, [loans])

  return (
    <div className="container mx-auto max-w-6xl space-y-10 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Active Borrowed Items
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor every active loan, track due dates, and review borrower details
            such as Slack handles at a glance. Data is refreshed from the Lagertool API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadLoansCalendar}
            disabled={downloadingCalendar}
          >
            {downloadingCalendar ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Preparing export…
              </>
            ) : (
              <>
                <CalendarDays className="size-4" aria-hidden="true" />
                Export .ics
              </>
            )}
          </Button>
          <Button asChild variant="secondary">
            <Link to="/borrow">Create loan</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="border-destructive/50 text-destructive flex flex-col gap-1 rounded-lg border bg-destructive/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
          <span className="font-medium">Unable to load loan data.</span>
          <span className="text-destructive/80 sm:flex-1">{error}</span>
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
              Sum of all items currently checked out.
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
              Unique people who currently have items on loan.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Loan overview</CardTitle>
            <CardDescription>
              Sorted by the soonest due date. Overdue rows are highlighted automatically.
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
              onClick={fetchData}
              disabled={loading}
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
                <TableHead className="px-6 py-3">Period</TableHead>
                <TableHead className="px-6 py-3 text-right">Qty</TableHead>
                <TableHead className="px-6 py-3 text-right">Status</TableHead>
                <TableHead className="px-6 py-3 text-right">Calendar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="px-6 py-10 text-center text-sm text-muted-foreground"
                    colSpan={6}
                  >
                    No active loans at the moment.
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => {
                  const dueTime = loan.until
                    ? new Date(loan.until).getTime()
                    : Number.NaN
                  const overdue = Number.isFinite(dueTime) && dueTime < Date.now()
                  const dueSoon =
                    Number.isFinite(dueTime) &&
                    !overdue &&
                    dueTime - Date.now() <= 3 * 24 * 60 * 60 * 1000
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

                  return (
                    <TableRow
                      key={loan.id}
                      className={
                        overdue
                          ? "bg-red-50/70 text-red-900"
                          : dueSoon
                          ? "bg-amber-50/70 text-amber-900"
                          : undefined
                      }
                    >
                      <TableCell className="px-6 py-4 align-top text-sm">
                        <div className="space-y-1">
                          <Link
                            to={`/items/${loan.item_id}`}
                            className="font-medium leading-tight text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {loan.item?.name ?? `Item #${loan.item_id}`}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {loan.item?.category
                              ? `Category: ${loan.item.category}`
                              : `Item ID: ${loan.item_id}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-sm">
                        <div className="space-y-1">
                          <PersonLink
                            personId={loan.person_id}
                            person={loan.person}
                            className="font-medium leading-tight"
                          />
                          <div className="text-xs text-muted-foreground">
                            Person ID: {loan.person_id}
                          </div>
                          {loan.person?.slackId ? (
                            <div className="text-xs text-muted-foreground">
                              Slack: {loan.person.slackId}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {formatDateTime(loan.begin)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due {formatDateTime(loan.until)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-right text-sm font-semibold">
                        {loan.amount}
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-right text-sm">
                        <span
                          className={`inline-flex items-center justify-end rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadSingleLoan(loan.id)}
                          disabled={downloadingLoanId === loan.id}
                        >
                          {downloadingLoanId === loan.id ? (
                            <>
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                              Preparing…
                            </>
                          ) : (
                            <>
                              <CalendarDays className="size-4" aria-hidden="true" />
                              .ics
                            </>
                          )}
                        </Button>
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
