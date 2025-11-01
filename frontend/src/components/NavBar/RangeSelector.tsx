import { useDate } from "@/store/useDate";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Button } from "../shadcn/button";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { ChevronDown, Search } from "lucide-react";
import { Calendar } from "../shadcn/calendar";

import styles from "./NavBar.module.css";
import { startOfToday } from "date-fns";

  
function RangeSelector() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const selectedRange = useDate((state) => state.selectedRange)
  const setRange = useDate((state) => state.setRange)
  const clearRange = useDate((state) => state.clearRange)
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    selectedRange?.from ?? new Date()
  )
  
  const today = startOfToday();
  const startMonth = new Date(today.getFullYear(), today.getMonth());
  const endMonth = new Date(today.getFullYear() + 1, 11);   // Dec of next year


  useEffect(() => {
    if (selectedRange?.from) setVisibleMonth(selectedRange.from)
  }, [selectedRange?.from])

  return (
    <>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Open calendar search filters"
            data-state={isCalendarOpen ? "open" : undefined}
            className={clsx(
              styles.rangeSelectorBtn,
              selectedRange?.from && styles.rangeSelectorBtnActive
            )}
          >
            <Search className={styles.navIcon} aria-hidden="true" />
            <ChevronDown className={styles.navIconSecondary} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="rounded-lg w-auto p-2">
          <Calendar
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            disabled={{ before: startOfToday() }}
            selected={selectedRange}
            defaultMonth={selectedRange?.from ?? new Date()}
            mode="range"
            onSelect={setRange}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
          />
          <div className="mt-3 flex w-full items-center justify-center gap-2 pb-2">
            <Button
              type="button"
              variant="ghost"
              onClick={clearRange}
              disabled={!selectedRange?.from}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsCalendarOpen(false)
              }}
            >
              Close
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export default RangeSelector;
