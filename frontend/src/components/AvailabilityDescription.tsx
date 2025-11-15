import { format } from "date-fns/format";
import type { DateRange } from "react-day-picker";

function AvailabilityDescription({ range }: {range: DateRange | undefined}) {
  let formattedDate = "";

  if (!range?.from) {
    formattedDate = "today";
  } else {
    const formattedStart = format(range.from, "MMM d, yyyy");
    if (!range.to || range.from === range.to) {
      formattedDate = formattedStart;
    } else {
      const formattedEnd = format(range.to, "MMM d, yyyy");
      formattedDate = `${formattedStart} – ${formattedEnd}`;
    }
  }

  return (
    <div className="text-base text-gray-300">
      Availability for <b>{formattedDate}</b>.
    </div>
  );
};

export default AvailabilityDescription;
