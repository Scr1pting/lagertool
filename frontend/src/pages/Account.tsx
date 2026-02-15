import { useMemo } from "react";
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
  const { data, status, refetch } = useFetchBorrowed()
  const sortMode: "recent" | "name" = "recent"

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
  }, [data])

  return (
    <RegularPage title="Account">
      <SummaryStatistics />

      {status === "success" && sortedEvents.length > 0 ? (
        <div className="space-y-8">
          {[
            { state: "overdue", label: "Overdue", color: "text-gray-300" },
            { state: "partial_overdue", label: "Partially Overdue", color: "text-gray-300" },
            { state: "pending", label: "Pending", color: "text-gray-300" },
            { state: "approved", label: "Approved", color: "text-gray-300" },
            { state: "on_loan", label: "On Loan", color: "text-gray-300" },
            { state: "returned", label: "Returned", color: "text-emerald-600" },
          ].map((section) => {
            const events = sortedEvents.filter((e) => e.state === section.state)
            if (events.length === 0) return null
            return (
              <section key={section.state}>
                <h2 className={`mb-3 text-lg font-semibold flex items-center gap-2 ${section.color}`}>
                  {section.label}
                </h2>
                <AccountEventsAccordion events={events} />
              </section>
            )
          })}
        </div>
      ) : null}

      {status === "success" && sortedEvents.length === 0 ? (
        <EmptyState onRetry={refetch} />
      ) : null}
    </RegularPage>
  )
}

export default Account
