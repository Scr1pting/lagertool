import { differenceInCalendarDays } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import type { BorrowedList } from "@/types/borrow"
import SortableHeader from "./SortableHeader"

import { formatDate } from "@/lib/cn"
import { Badge } from "@/components/shadcn/badge"
import { getBorrowStateUI } from "@/lib/borrow-ui"


const borrowedColumns: ColumnDef<BorrowedList>[] = [
  {
    accessorKey: "itemName",
    header: ({ column }) => <SortableHeader column={column} title="Item" />,
    cell: ({ row }) => row.original.itemName,
  },
  {
    accessorKey: "borrowDate",
    header: ({ column }) => <SortableHeader column={column} title="Borrowed" />,
    sortingFn: (a, b) =>
      new Date(a.original.borrowDate).getTime() - new Date(b.original.borrowDate).getTime(),
    cell: ({ row }) => formatDate(row.original.borrowDate),
  },
  {
    accessorKey: "returnDate",
    header: ({ column }) => <SortableHeader column={column} title="Due/Return" />,
    sortingFn: (a, b) =>
      new Date(a.original.returnDate ?? 0).getTime() - new Date(b.original.returnDate ?? 0).getTime(),
    cell: ({ row }) => row.original.returnDate ? formatDate(row.original.returnDate) : "—",
  },
  {
    id: "status",
    header: () => <div className="text-right">Status</div>,
    cell: ({ row }) => {
      const { state, returnDate } = row.original
      const now = new Date()
      const isOverdue = row.original.state === "overdue"

      const dueDate = returnDate ? new Date(returnDate) : null
      const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false
      const days = isDueValid ? differenceInCalendarDays(dueDate!, now) : null

      const { label, variant: badgeVariant } = getBorrowStateUI(state)

      const daysLabel = isOverdue && days !== null && state !== "returned"
        ? `${Math.abs(days)}d late`
        : ""

      return (
        <div className="text-right">
          <Badge variant={badgeVariant}>{label}</Badge>
          {daysLabel && <div className="text-xs text-muted-foreground">{daysLabel}</div>}
        </div>
      )
    },
  },

]

export default borrowedColumns
