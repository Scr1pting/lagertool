import { formatDate } from "@/lib/formatDate"
import { useDate } from "@/store/useDate"

function AvailabilityDescription() {
  const range = useDate(state => state.selectedRange)

  let formattedDate = ""

  if (!range?.from) {
    formattedDate = "today"
  } else {
    const formattedStart = formatDate(range.from)
    if (!range.to || range.from === range.to) {
      formattedDate = formattedStart
    } else {
      const formattedEnd = formatDate(range.to)
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
