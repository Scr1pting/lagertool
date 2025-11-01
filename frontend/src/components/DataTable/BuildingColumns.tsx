import type { ColumnDef } from "@tanstack/react-table"
import DataTableColumnHeader from "./DataTableSortedHeader"
import type { Building } from "@/types/building"

const buildingColumns: ColumnDef<Building>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Building" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
]

export default buildingColumns
