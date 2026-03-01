import { useDate } from "@/store/useDate"

export function useDateParams() {
    const selectedRange = useDate(s => s.selectedRange)
    const startDate = selectedRange?.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    const endDate = selectedRange?.to?.toISOString().split('T')[0] || startDate

    return { startDate, endDate }
}
