"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
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

const formatDate = (iso?: string) => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date)
}

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
    <div className="container mx-auto max-w-6xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Active Borrowed Items
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor every active loan, track due dates, and review borrower details
          such as Slack handles at a glance. Data is refreshed from the Lagertool API.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadLoansCalendar}
            disabled={downloadingCalendar}
          >
            {downloadingCalendar ? "Preparing download…" : "Download loans calendar (.ics)"}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Active loans
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.totalLoans}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Total number of outstanding loan records.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Items out
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.totalItems}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sum of all items currently checked out.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Overdue loans
          </p>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {summary.overdueCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Items that should already be returned.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Borrowers
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {summary.uniqueBorrowers}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unique people who currently have items on loan.
          </p>
        </article>
      </section>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-medium">Loan overview</h2>
            <p className="text-xs text-muted-foreground">
              Sorted by the soonest due date. Overdue rows are highlighted in
              red.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {loading ? <span>Refreshing…</span> : null}
            <Button variant="secondary" size="sm" onClick={fetchData}>
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
                <th className="px-6 py-3 font-medium">Slack handle</th>
                <th className="px-6 py-3 font-medium">Borrowed</th>
                <th className="px-6 py-3 font-medium">Due</th>
                <th className="px-6 py-3 font-medium text-right">Qty</th>
                <th className="px-6 py-3 font-medium text-right">Status</th>
                <th className="px-6 py-3 font-medium text-right">Calendar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loans.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                    colSpan={8}
                  >
                    No active loans at the moment.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const overdue =
                    loan.until && new Date(loan.until).getTime() < Date.now()
                  const dueSoon =
                    loan.until &&
                    !overdue &&
                    new Date(loan.until).getTime() <
                      Date.now() + 2 * 24 * 60 * 60 * 1000
                  const statusLabel = overdue
                    ? "Overdue"
                    : dueSoon
                    ? "Due soon"
                    : "On schedule"
                  const statusClasses = overdue
                    ? "bg-red-100 text-red-700"
                    : dueSoon
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"

                  return (
                    <tr
                      key={loan.id}
                      className={
                        overdue
                          ? "bg-red-50/70 text-red-900"
                          : dueSoon
                          ? "bg-amber-50/70 text-amber-900"
                          : ""
                      }
                    >
                      <td className="px-6 py-4 text-sm">
                        <Link
                          to={`/items/${loan.item_id}`}
                          className="block font-medium leading-tight text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {loan.item?.name ?? `Item #${loan.item_id}`}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          Category: {loan.item?.category ?? "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
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
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {loan.person?.slackId ? (
                          <span>Slack: {loan.person.slackId}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{formatDate(loan.begin)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(loan.begin)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{formatDate(loan.until)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(loan.until)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {loan.amount}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadSingleLoan(loan.id)}
                          disabled={downloadingLoanId === loan.id}
                        >
                          {downloadingLoanId === loan.id ? "Preparing…" : "Download .ics"}
                        </Button>
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
