import { format } from "date-fns/format";
import type { DateRange } from "react-day-picker";

function SelectedRangeDesc({ range }: {range: DateRange | undefined}) {
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
    <>
      Showing availability for <b>{formattedDate}</b>. Modify by clicking on the magnifying glass in the search bar.
    </>
  );
};

export default SelectedRangeDesc;
