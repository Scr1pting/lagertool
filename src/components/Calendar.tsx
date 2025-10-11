"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"

export function BorrowCalendar() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()

  const handleSelect = (range?: DateRange) => {
    setDateRange(range)

    if (range?.from) {
      console.log(range.from.toISOString())
    }

    if (range?.to) {
      console.log(range.to.toISOString())
    }
  }

  return (
    <Calendar
      mode="range"
      selected={dateRange}
      onSelect={handleSelect}
      defaultMonth={dateRange?.from}
      numberOfMonths={1}
      className="rounded-md border shadow-sm"
      captionLayout="dropdown"
    />
  )
}

export default BorrowCalendar
