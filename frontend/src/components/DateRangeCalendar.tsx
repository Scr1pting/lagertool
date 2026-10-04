import { startOfToday } from "date-fns"
import { useEffect, useState } from "react"
import type { DateRange } from "react-day-picker"
import { Calendar } from "./shadcn/calendar"

interface DateRangeCalendarProps {
  selected: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
}

// Picks a borrow period: from today until the end of next year.
function DateRangeCalendar({ selected, onSelect }: DateRangeCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(selected?.from ?? new Date())

  const today = startOfToday()
  const startMonth = new Date(today.getFullYear(), today.getMonth())
  const endMonth = new Date(today.getFullYear() + 1, 11)   // Dec of next year

  useEffect(() => {
    if (selected?.from) setVisibleMonth(selected.from)
  }, [selected?.from])

  return (
    <Calendar
      month={visibleMonth}
      onMonthChange={setVisibleMonth}
      disabled={{ before: today }}
      selected={selected}
      defaultMonth={selected?.from ?? new Date()}
      mode="range"
      onSelect={onSelect}
      captionLayout="dropdown"
      startMonth={startMonth}
      endMonth={endMonth}
    />
  )
}

export default DateRangeCalendar
