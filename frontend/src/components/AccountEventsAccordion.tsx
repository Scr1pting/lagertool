import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion"
import type { BorrowedList, Event } from "@/types/borrow"
import { formatDate } from "@/lib/formatDate"


function ItemsList({ items }: { items: BorrowedList[] }) {
  return (
    <div className="divide-y rounded-lg border">
      <div className="grid grid-cols-4 px-4 py-2 text-sm font-medium text-muted-foreground">
        <span className="col-span-2 text-left">Item</span>
        <span className="text-left">Borrowed</span>
        <span className="text-left">Due</span>
      </div>
      {items.map(item => {
        return (
          <div
            key={item.id}
            className="grid grid-cols-4 items-center px-4 py-3 text-sm"
          >
            <div className="col-span-2">
              <div className="font-medium">{item.itemName}</div>
            </div>
            <div>{formatDate(item.borrowDate)}</div>
            <div>{formatDate(item.dueDate)}</div>
          </div>
        )
      })}
    </div>
  )
}





function EventSummary({ event }: { event: Event }) {
  const overdueCount = event.items.filter(item => item.state === "overdue").length
  const totalCount = event.items.length

  const created = formatDate(event.createdAt)
  const title = event.eventName || `Event ${event.id}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
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
