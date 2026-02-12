import { differenceInCalendarDays } from "date-fns"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion"
import type { BorrowedList, Event } from "@/types/borrow"
import { Check } from 'lucide-react';
import { CircleAlert } from 'lucide-react';
import { Clock } from 'lucide-react';
import { Undo2 } from 'lucide-react';
import { CircleArrowOutUpRight } from 'lucide-react';
import { Badge } from "@/components/shadcn/badge"
import { formatDate } from "@/lib/utils"
import { getBorrowStateUI } from "@/lib/borrow-ui"


const itemStatus = (item: BorrowedList) => {
  const now = new Date()
  const dueDate = item.dueDate ? new Date(item.dueDate) : null
  const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false
  const isOverdue = item.state === "overdue"
  const days = isDueValid ? differenceInCalendarDays(dueDate!, now) : null

  const { label, variant: tone } = getBorrowStateUI(item.state)

  const daysLabel = item.state === "returned"
    ? ""
    : isOverdue && days !== null
      ? `${Math.abs(days)}d late`
      : ""

  return { label, daysLabel, tone }
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



function getEventIconInfo(state: string) {
  switch (state) {
    case "approved": return { Icon: Check, color: "text-blue-600" }
    case "overdue": return { Icon: CircleAlert, color: "text-red-600" }
    case "partial_overdue": return { Icon: CircleAlert, color: "text-amber-600" }
    case "pending": return { Icon: Clock, color: "text-yellow-600" }
    case "returned": return { Icon: Undo2, color: "text-emerald-600" }
    default: return { Icon: CircleArrowOutUpRight, color: "text-white-600" }
  }
}

function EventSummary({ event }: { event: Event }) {
  const overdueCount = event.items.filter(item => item.state === "overdue").length
  const totalCount = event.items.length

  const { Icon, color } = getEventIconInfo(event.state)
  const created = formatDate(event.createdAt)
  const title = event.eventName || `Event ${event.id}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground">Created {created}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>{totalCount} item{totalCount === 1 ? "" : "s"}</span>
        {overdueCount > 0 ? <span className="text-red-600">{overdueCount} / {totalCount} overdue</span> : null}
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
      {events.map(event =>
        <AccordionItem
          key={event.id}
          value={event.id}
          className="rounded-lg px-4 border"
        >
          <AccordionTrigger className="py-3 hover:no-underline">
            <EventSummary event={event} />
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-3">
              <span className="font-medium">Message:</span> This is a placeholder for an admin message or instructions about the approved loan.
            </p>

            {event.items.length ? (
              <ItemsList items={event.items} />
            ) : (
              <div className="text-sm text-muted-foreground">No items in this event.</div>
            )}
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  )
}

export default AccountEventsAccordion
