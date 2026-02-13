import { format } from "date-fns"

export function formatDate(date: Date | string | number | undefined | null): string {
  if (!date) return "—"
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "Date unavailable"
  return format(d, "MMM d, yyyy")
}
