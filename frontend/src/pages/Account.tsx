import { useMemo, useState } from "react";
import RegularPage from "@/components/RegularPage";
import useFetchBorrowed from "@/hooks/fetch/useFetchBorrowed";
import AccountEventsAccordion from "@/components/AccountEventsAccordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Button } from "@/components/shadcn/button";

const SkeletonRow = () => (
  <div className="animate-pulse rounded-lg border px-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
    </div>
    <div className="mt-3 grid grid-cols-5 gap-4 text-sm">
      <div className="col-span-2 h-4 rounded bg-muted" />
      <div className="h-4 rounded bg-muted" />
      <div className="h-4 rounded bg-muted" />
      <div className="h-4 rounded bg-muted" />
    </div>
  </div>
)

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
  const { data, status, error, refetch } = useFetchBorrowed()
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
    <RegularPage title="Account" description="Your borrowed items">
      <Tabs value={sortMode} onValueChange={v => setSortMode(v as "recent" | "name")} className="mb-4">
        <TabsList className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <TabsTrigger value="recent" className="text-sm">
            Sort: Most Recent
          </TabsTrigger>
          <TabsTrigger value="name" className="text-sm">
            Sort: Name
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {status === "loading" ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Failed to load borrowed items</p>
          <p>{error?.message || "Unknown error"}</p>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={refetch}>Retry</Button>
          </div>
        </div>
      ) : null}

      {status === "success" && sortedEvents.length ? (
        <AccountEventsAccordion events={sortedEvents} />
      ) : null}

      {status === "success" && sortedEvents.length === 0 ? (
        <EmptyState onRetry={refetch} />
      ) : null}
    </RegularPage>
  )
}

export default Account
