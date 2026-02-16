import type { ColumnDef } from "@tanstack/react-table"
import SortableHeader from "../SortableHeader"
import type { BorrowItem } from "@/types/borrowRequest"


export const borrowColumns: ColumnDef<BorrowItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <SortableHeader column={column} title="Location" />
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = (rowA.original.building.name || "") + "/" + (rowA.original.room.name || "")
      const b = (rowB.original.building.name || "") + "/" + (rowB.original.room.name || "")
      return a.localeCompare(b)
    },
    cell: ({ row }) => {
      const building = row.original.building.name || "unknown"
      const room = row.original.room.name || "unknown"
      return <div>{building + "/" + room}</div>
    },
  },
  {
    accessorKey: "borrowed",
    header: () => <div className="text-right">Borrowed</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.original.borrowed}</div>
    ),
  }
]
