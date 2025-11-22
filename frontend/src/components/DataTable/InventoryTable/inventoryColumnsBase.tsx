import type { ColumnDef } from "@tanstack/react-table"
import type { InventoryItem } from "@/types/inventory"
import SortableHeader from "../SortableHeader"


export const inventoryColumnsBase: ColumnDef<InventoryItem>[] = [
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
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("amount")}</div>
    ),
  },
  {
    accessorKey: "available",
    header: () => <div className="text-right">Available</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("available")}</div>
    ),
  }
]
