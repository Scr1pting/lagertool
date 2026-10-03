import { format } from "date-fns/format"
import { useDate } from "@/store/useDate"

// Calendar dates as yyyy-MM-dd in local time. (toISOString() converts to UTC,
// which turns a picked local midnight into the previous day east of UTC.)
const toDateParam = (d: Date) => format(d, "yyyy-MM-dd")

export function useDateParams() {
    const selectedRange = useDate(s => s.selectedRange)
    const startDate = selectedRange?.from ? toDateParam(selectedRange.from) : toDateParam(new Date())
    const endDate = selectedRange?.to ? toDateParam(selectedRange.to) : startDate

    return { startDate, endDate }
}
