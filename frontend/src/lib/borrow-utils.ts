import { isAfter } from "date-fns"
import type { BorrowedList, Event } from "@/types/borrow"

export type EventMeta = {
    overdueCount: number
    totalCount: number
    derivedState: Event["state"]
}

export function isItemOverdue(item: BorrowedList): boolean {
    if (item.state === "returned") return false

    const dueDate = item.dueDate ? new Date(item.dueDate) : null
    const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false

    const derivedOverdue = isDueValid ? isAfter(new Date(), dueDate!) : false

    return item.state === "overdue" || derivedOverdue
}


export function getEventMeta(event: Event): EventMeta {
    const overdueCount = event.items.filter(isItemOverdue).length
    const totalCount = event.items.length
    const allReturned = totalCount > 0 && event.items.every(item => item.state === "returned")

    let derivedState: Event["state"] = event.state

    if (allReturned) {
        derivedState = "returned"
    } else if (overdueCount === totalCount && totalCount > 0) {
        derivedState = "overdue"
    } else if (overdueCount > 0) {
        derivedState = "partial_overdue"
    }

    return { overdueCount, totalCount, derivedState }
}
