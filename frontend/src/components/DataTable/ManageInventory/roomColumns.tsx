import type { ColumnDef } from "@tanstack/react-table"
import type { Room } from "@/types/room"
import SortableHeader from "../SortableHeader"

const roomColumns: ColumnDef<Room>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column} title="Room" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    id: "building",
    accessorFn: (row) => row.building?.name ?? "",
    header: ({ column }) => (
      <SortableHeader column={column} title="Building" />
    ),
    cell: ({ row }) => <div>{row.getValue("building")}</div>,
  },
]

export default roomColumns
