import type { ColumnDef } from "@tanstack/react-table"
import type { BorrowedList } from "@/types/borrow"
import SortableHeader from "./SortableHeader"
import { formatDate } from "@/lib/utils"


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


]

export default borrowedColumns
