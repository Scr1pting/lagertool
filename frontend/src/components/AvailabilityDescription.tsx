import { useDate } from "@/store/useDate"
import { format } from "date-fns/format"

function AvailabilityDescription() {
  const range = useDate(state => state.selectedRange)

  let formattedDate = ""

  if (!range?.from) {
    formattedDate = "today"
  } else {
    const formattedStart = format(range.from, "MMM d, yyyy")
    if (!range.to || range.from === range.to) {
      formattedDate = formattedStart
    } else {
      const formattedEnd = format(range.to, "MMM d, yyyy")
      formattedDate = `${formattedStart} – ${formattedEnd}`
    }
  }

  return (
    <p className="text-base text-[#BBB]">
      Availability for <b>{formattedDate}</b>.
    </p>
  )
};

export default AvailabilityDescription
