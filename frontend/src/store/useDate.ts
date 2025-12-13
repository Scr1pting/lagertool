import { create } from "zustand"
import type { DateRange } from "react-day-picker"

interface DateFilterState {
  selectedRange?: DateRange
  setRange: (range?: DateRange) => void
  clearRange: () => void
}

export const useDate = create<DateFilterState>(set => ({
  selectedRange: undefined,
  setRange: range => set({ selectedRange: range }),
  clearRange: () => set({ selectedRange: undefined }),
}))
