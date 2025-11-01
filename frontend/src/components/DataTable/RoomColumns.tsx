import type { ColumnDef } from "@tanstack/react-table"
import DataTableColumnHeader from "./DataTableSortedHeader"
import type { Room } from "@/types/room"

const roomColumns: ColumnDef<Room>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Room" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "building",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Building" />
    ),
    cell: ({ row }) => <div>{row.getValue("building")}</div>,
  },
]

export default roomColumns
