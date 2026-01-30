import { format, differenceInCalendarDays, isAfter } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import type { BorrowItem } from "@/types/borrow"
import SortableHeader from "./SortableHeader"
import MessageButton from "../MessageButton"


const borrowedColumns: ColumnDef<BorrowItem>[] = [
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
    cell: ({ row }) => {
      const date = new Date(row.original.borrowDate)
      return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy")
    },
  },
  {
    accessorKey: "returnDate",
    header: ({ column }) => <SortableHeader column={column} title="Due/Return" />,
    sortingFn: (a, b) =>
      new Date(a.original.returnDate ?? 0).getTime() - new Date(b.original.returnDate ?? 0).getTime(),
    cell: ({ row }) => {
      if (!row.original.returnDate) return "—"
      const date = new Date(row.original.returnDate)
      return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy")
    },
  },
  {
    id: "status",
    header: () => <div className="text-right">Status</div>,
    cell: ({ row }) => {
      const { state, returnDate } = row.original
      const now = new Date()
      const dueDate = returnDate ? new Date(returnDate) : null
      const isDueValid = dueDate ? !Number.isNaN(dueDate.getTime()) : false
      const derivedOverdue = isDueValid ? isAfter(now, dueDate!) : false
      const isOverdue = state === "overdue" || derivedOverdue
      const days = isDueValid ? differenceInCalendarDays(dueDate!, now) : null
      const label = state === "pending" ? "Pending"
        : state === "approved" ? "Approved"
        : state === "returned" ? "Returned"
        : isOverdue ? "Overdue" : "On loan"
      const daysLabel = state === "overdue" && days !== null
        ? `${Math.abs(days)}d late`
        : ""
      const badgeClass =
        state === "pending" ? "bg-yellow-100 text-yellow-700" :
        state === "approved" ? "bg-blue-100 text-blue-700" :
        state === "returned" ? "bg-emerald-100 text-emerald-700" :
        isOverdue ? "bg-red-100 text-red-700" :
        "bg-slate-100 text-slate-700"
      return (
        <div className="text-right">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass}`}>{label}</span>
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
