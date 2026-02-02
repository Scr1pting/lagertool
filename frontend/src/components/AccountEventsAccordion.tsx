import { differenceInCalendarDays, format, isAfter } from "date-fns"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion"
import MessageButton from "@/components/MessageButton"
import type { BorrowedList, Event } from "@/types/borrow"

type BadgeProps = {
  label: string;
  tone: "yellow" | "blue" | "red" | "slate" | "emerald" | "amber";
};

const badgeToneClass: Record<BadgeProps["tone"], string> = {
  yellow: "bg-yellow-100 text-yellow-700",
  blue: "bg-blue-100 text-blue-700",
  red: "bg-red-100 text-red-700",
  emerald: "bg-emerald-100 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-700",
}

function Badge({ label, tone }: BadgeProps) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeToneClass[tone]}`}>
      {label}
    </span>
  )
}

function formatMaybeDate(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "Date unavailable"
  return format(d, "MMM d, yyyy")
}

function itemStatus(item: BorrowedList) {
  const now = new Date()
  const dueDate = item.dueDate ? new Date(item.dueDate) : null
  const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false
  const derivedOverdue = isDueValid ? isAfter(now, dueDate!) : false
  const isOverdue = item.state === "overdue" || derivedOverdue
  const days = isDueValid ? differenceInCalendarDays(dueDate!, now) : null
  const label =
    item.state === "pending" ? "Pending" :
    item.state === "approved" ? "Approved" :
    item.state === "returned" ? "Returned" :
    isOverdue ? "Overdue" : "On loan"
  const daysLabel = item.state === "returned"
    ? ""
    : isOverdue && days !== null
      ? `${Math.abs(days)}d late`
      : ""
  const tone: BadgeProps["tone"] =
    item.state === "pending" ? "yellow" :
    item.state === "approved" ? "blue" :
    item.state === "returned" ? "emerald" :
    isOverdue ? "red" :
    "slate"

  return { label, daysLabel, tone }
}

function eventTone(state: Event["state"]) {
  switch (state) {
    case "pending": return { label: "Pending", tone: "yellow" as const }
    case "approved": return { label: "Approved", tone: "blue" as const }
    case "returned": return { label: "Returned", tone: "emerald" as const }
    case "partial_overdue": return { label: "Partial overdue", tone: "amber" as const }
    case "overdue": return { label: "Overdue", tone: "red" as const }
    default: return { label: "On loan", tone: "slate" as const }
  }
}

function ItemsList({ items }: { items: BorrowedList[] }) {
  return (
    <div className="divide-y rounded-lg border">
      <div className="grid grid-cols-5 px-4 py-2 text-sm font-medium text-muted-foreground">
        <span className="col-span-2 text-left">Item</span>
        <span className="text-left">Borrowed</span>
        <span className="text-left">Due</span>
        <span className="text-left">Status</span>
      </div>
      {items.map(item => {
        const { label, daysLabel, tone } = itemStatus(item)
        const rowOverdue = tone === "red"
        return (
          <div
            key={item.id}
            className={`grid grid-cols-5 items-center px-4 py-3 text-sm ${
              rowOverdue ? "bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-500 rounded-md" : ""
            }`}
          >
            <div className="col-span-2">
              <div className="font-medium">{item.itemName}</div>
            </div>
            <div>{formatMaybeDate(item.borrowDate)}</div>
            <div>{formatMaybeDate(item.dueDate)}</div>
            <div className="text-right sm:text-left">
              <Badge label={label} tone={tone} />
              {daysLabel && <div className="mt-1 text-xs text-red-600">{daysLabel}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

type EventMeta = {
  overdueCount: number;
  totalCount: number;
  derivedState: Event["state"];
};

function itemIsOverdue(item: BorrowedList) {
  if (item.state === "returned") return false
  const dueDate = item.dueDate ? new Date(item.dueDate) : null
  const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false
  const derivedOverdue = isDueValid ? isAfter(new Date(), dueDate!) : false
  return item.state === "overdue" || derivedOverdue
}

function buildEventMeta(event: Event): EventMeta {
  const overdueCount = event.items.filter(itemIsOverdue).length
  const totalCount = event.items.length
  const allReturned = totalCount > 0 && event.items.every(item => item.state === "returned")

  const derivedState: Event["state"] =
    allReturned
      ? "returned"
      : overdueCount === totalCount && totalCount > 0
        ? "overdue"
        : overdueCount > 0
          ? "partial_overdue"
          : event.state === "partial_overdue" || event.state === "overdue"
            ? event.state
            : event.state
  return { overdueCount, totalCount, derivedState }
}

function EventSummary({ event, meta }: { event: Event; meta: EventMeta }) {
  const { overdueCount, totalCount, derivedState } = meta
  const { label, tone } = eventTone(derivedState)
  const created = formatMaybeDate(event.createdAt)
  const title = event.eventName || `Event ${event.id}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground">{title}</span>
        <Badge label={label} tone={tone} />
        <span className="text-muted-foreground">Created {created}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>{totalCount} item{totalCount === 1 ? "" : "s"}</span>
        {overdueCount > 0 ? <span className="text-red-600">{overdueCount} overdue</span> : null}
      </div>
    </div>
  )
}

interface AccountEventsAccordionProps {
  events: Event[];
}

function AccountEventsAccordion({ events }: AccountEventsAccordionProps) {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {events.map(event => {
        const meta = buildEventMeta(event)
        const showMessage = meta.derivedState === "approved"
        const isOverdueish = meta.derivedState === "overdue" || meta.derivedState === "partial_overdue"
        return (
          <AccordionItem
            key={event.id}
            value={event.id}
            className={`rounded-lg px-4 ${
              isOverdueish
                ? "border border-red-300 dark:border-red-400"
                : "border"
            }`}
          >
            <AccordionTrigger className="py-3">
              <EventSummary event={event} meta={meta} />
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {showMessage ? (
                <div className="mb-3 flex justify-end">
                  <MessageButton label="Message borrower" />
                </div>
              ) : null}
              {event.items.length ? (
                <ItemsList items={event.items} />
              ) : (
                <div className="text-sm text-muted-foreground">No items in this event.</div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

export default AccountEventsAccordion
