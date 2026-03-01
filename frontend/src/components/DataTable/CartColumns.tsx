import type { InventoryItem } from "@/types/inventory"
import type { ColumnDef } from "@tanstack/react-table"
import DataTableColumnHeader from "./SortableHeader"


const cartColumns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div>{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
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
    accessorKey: "available",
    header: () => <div className="text-right">Available</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("available")}</div>
    ),
  },
  {
    accessorKey: "numSelected",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("numSelected")}</div>
    ),
  }
]

export default cartColumns
