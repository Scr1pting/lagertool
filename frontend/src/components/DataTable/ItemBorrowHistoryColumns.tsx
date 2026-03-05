import type { ColumnDef } from "@tanstack/react-table"
import type { ItemBorrowEvent } from "@/types/inventory"
import SortableHeader from "./SortableHeader"
import { formatDate } from "@/lib/formatDate"
import { Badge } from "@/components/shadcn/badge"
import { APPROVAL_STATES, TIME_STATES } from "@/types/borrowRequest"

const itemBorrowHistoryColumns: ColumnDef<ItemBorrowEvent>[] = [
  {
    accessorKey: "authorName",
    header: ({ column }) => <SortableHeader column={column} title="User" />,
    cell: ({ row }) => row.original.authorName,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column} title="Event" />,
    cell: ({ row }) => row.original.title,
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => <SortableHeader column={column} title="Borrowed" />,
    sortingFn: (a, b) =>
      new Date(a.original.startDate).getTime() - new Date(b.original.startDate).getTime(),
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: "returnDate",
    header: ({ column }) => <SortableHeader column={column} title="Return" />,
    sortingFn: (a, b) =>
      new Date(a.original.returnedDate ?? a.original.endDate).getTime() - new Date(b.original.returnedDate ?? b.original.endDate).getTime(),
    cell: ({ row }) => formatDate(row.original.returnedDate),
  },
  {
    accessorKey: "endDate",
    header: ({ column }) => <SortableHeader column={column} title="Due" />,
    sortingFn: (a, b) =>
      new Date(a.original.endDate).getTime() - new Date(b.original.endDate).getTime(),
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  {
    accessorKey: "state",
    header: ({ column }) => <SortableHeader column={column} title="State" />,
    sortingFn: (a, b) => {
      const approvalCompare = a.original.approvalState.localeCompare(b.original.approvalState)
      if (approvalCompare !== 0) return approvalCompare

      if (a.original.timeState && b.original.timeState) {
        return a.original.timeState.localeCompare(b.original.timeState)
      }

      return 0
    },
    cell: ({ row }) =>
      <div className="flex flex-col gap-2">
        <Badge variant={APPROVAL_STATES[row.original.approvalState].color}>
          {APPROVAL_STATES[row.original.approvalState].title}
        </Badge>
        {row.original.timeState
          && <Badge variant={TIME_STATES[row.original.timeState].color}>
            {TIME_STATES[row.original.timeState].title}
          </Badge>
        }
      </div>
    ,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader column={column} title="Amount" />,
    cell: ({ row }) => row.original.amount,
  },
]

export default itemBorrowHistoryColumns
