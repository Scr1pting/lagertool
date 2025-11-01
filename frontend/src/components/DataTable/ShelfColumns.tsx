import type { ColumnDef } from "@tanstack/react-table"
import DataTableColumnHeader from "./DataTableSortedHeader"
import type { Shelf } from "@/types/shelf"

const shelfColumns: ColumnDef<Shelf>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Building" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = (rowA.original.buildingName || "") + "/" + (rowA.original.roomName || "")
      const b = (rowB.original.buildingName || "") + "/" + (rowB.original.roomName || "")
      return a.localeCompare(b)
    },
    cell: ({ row }) => {
      const building = row.original.buildingName || "unknown"
      const room = row.original.roomName || "unknown"
      return <div>{building + "/" + room}</div>
    },
  },
]

export default shelfColumns
