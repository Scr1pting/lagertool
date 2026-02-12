import { differenceInCalendarDays } from "date-fns"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion"
import MessageButton from "@/components/MessageButton"
import type { BorrowedList, Event } from "@/types/borrow"

import { Badge } from "@/components/shadcn/badge"
import { formatDate } from "@/lib/utils"




const itemStatus = (item: BorrowedList) => {
  const now = new Date()
  const dueDate = item.dueDate ? new Date(item.dueDate) : null
  const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false
  const isOverdue = item.state === "overdue"
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
  const tone: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | "yellow" | "blue" | "red" | "emerald" | "slate" | "amber" =
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

        return (
          <div
            key={item.id}
            className="grid grid-cols-5 items-center px-4 py-3 text-sm"
          >
            <div className="col-span-2">
              <div className="font-medium">{item.itemName}</div>
            </div>
            <div>{formatDate(item.borrowDate)}</div>
            <div>{formatDate(item.dueDate)}</div>
            <div className="text-right sm:text-left">
              <Badge variant={tone}>{label}</Badge>
              {daysLabel && <div className="mt-1 text-xs text-red-600">{daysLabel}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}



function EventSummary({ event }: { event: Event }) {
  const overdueCount = event.items.filter(item => item.state === "overdue").length
  const totalCount = event.items.length
  const { label, tone } = eventTone(event.state)
  const created = formatDate(event.createdAt)
  const title = event.eventName || `Event ${event.id}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground">{title}</span>
        <Badge variant={tone}>{label}</Badge>
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
        const showMessage = event.state === "approved"

        return (
          <AccordionItem
            key={event.id}
            value={event.id}
            className="rounded-lg px-4 border"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <EventSummary event={event} />
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
