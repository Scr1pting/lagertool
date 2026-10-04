import type { ColumnDef } from "@tanstack/react-table"
import type { Shelf } from "@/types/shelf"
import SortableHeader from "../SortableHeader"

const location = (shelf: Shelf) => `${shelf.building?.name || "unknown"}/${shelf.room?.name || "unknown"}`

const shelfColumns: ColumnDef<Shelf>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column} title="Building" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <SortableHeader column={column} title="Location" />
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => location(rowA.original).localeCompare(location(rowB.original)),
    cell: ({ row }) => <div>{location(row.original)}</div>,
  },
]

export default shelfColumns
