import { useMemo, useState } from "react";
import RegularPage from "@/components/RegularPage";
import useFetchBorrowed from "@/hooks/fetch/useFetchBorrowed";
import AccountEventsAccordion from "@/components/AccountEventsAccordion";
import { Button } from "@/components/shadcn/button";
import SummaryStatistics from "@/components/Accounts/SummaryStatistics";


const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/20 p-6 text-center">
    <div className="text-3xl">📂</div>
    <div>
      <p className="text-sm font-medium text-foreground">No borrowed events yet</p>
      <p className="text-sm text-muted-foreground">Add one or reload once data is available.</p>
    </div>
    <Button variant="secondary" size="sm" onClick={onRetry}>
      Retry
    </Button>
  </div>
)

function Account() {
  const { data, status, error } = useFetchBorrowed()
  const [sortMode, setSortMode] = useState<"recent" | "name">("recent")

  const sortedEvents = useMemo(() => {
    if (!data) return []
    const copy = [...data]
    const isCritical = (event: (typeof copy)[number]) => {
      return event.state === "overdue" || event.state === "partial_overdue"
    }

    if (sortMode === "recent") {
      return copy.sort((a, b) => {
        const aCritical = isCritical(a)
        const bCritical = isCritical(b)
        if (aCritical !== bCritical) return aCritical ? -1 : 1
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bDate - aDate
      })
    }
    return copy.sort((a, b) => {
      const aCritical = isCritical(a)
      const bCritical = isCritical(b)
      if (aCritical !== bCritical) return aCritical ? -1 : 1
      return (a.eventName || a.id).localeCompare(b.eventName || b.id)
    })
  }, [data, sortMode])

  return (
    <RegularPage title="Account">
      <SummaryStatistics />

      {status === "success" && sortedEvents.length > 0 ? (
        <div className="space-y-8">
          {sortedEvents.some(e => e.state === "overdue" || e.state === "partial_overdue") && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-red-400 flex items-center gap-2">
                Overdue
              </h2>
              <AccountEventsAccordion
                events={sortedEvents.filter(e => e.state === "overdue" || e.state === "partial_overdue")}
              />
            </section>
          )}

          {sortedEvents.some(e => e.state === "pending" || e.state === "approved" || e.state === "on_loan") && (
            <section>
              <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
                Current
              </h2>
              <AccountEventsAccordion
                events={sortedEvents.filter(e => e.state === "pending" || e.state === "approved" || e.state === "on_loan")}
              />
            </section>
          )}

          {sortedEvents.some(e => e.state === "returned") && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-green-300 flex items-center gap-2">
                Returned
              </h2>
              <AccountEventsAccordion
                events={sortedEvents.filter(e => e.state === "returned")}
              />
            </section>
          )}
        </div>
      ) : null}

      {status === "success" && sortedEvents.length === 0 ? (
        <EmptyState onRetry={refetch} />
      ) : null}
    </RegularPage>
  )
}

export default Account
