import { differenceInCalendarDays } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import type { BorrowedList } from "@/types/borrow"
import SortableHeader from "./SortableHeader"
import MessageButton from "../MessageButton"
import { isItemOverdue } from "@/lib/borrow-utils"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/shadcn/badge"


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
      const isOverdue = isItemOverdue(row.original)

      const dueDate = returnDate ? new Date(returnDate) : null
      const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false
      const days = isDueValid ? differenceInCalendarDays(dueDate!, now) : null

      const label = state === "pending" ? "Pending"
        : state === "approved" ? "Approved"
          : state === "returned" ? "Returned"
            : isOverdue ? "Overdue" : "On loan"

      const daysLabel = isOverdue && days !== null && state !== "returned"
        ? `${Math.abs(days)}d late`
        : ""

      const badgeVariant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | "yellow" | "blue" | "red" | "emerald" | "slate" | "amber" =
        state === "pending" ? "yellow" :
          state === "approved" ? "blue" :
            state === "returned" ? "emerald" :
              isOverdue ? "red" :
                "slate"

      return (
        <div className="text-right">
          <Badge variant={badgeVariant}>{label}</Badge>
          {daysLabel && <div className="text-xs text-muted-foreground">{daysLabel}</div>}
        </div>
      )
    },
  },
  {
    id: "message",
    header: () => <div className="text-right">Message</div>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.state === "approved" ? <MessageButton /> : null}
      </div>
    ),
  },
]

export default borrowedColumns
