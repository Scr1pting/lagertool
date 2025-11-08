import type { ColumnDef } from "@tanstack/react-table"
import DataTableColumnHeader from "../DataTableSortedHeader"
import type { InventoryItem } from "@/types/inventory"
import InventoryActions from "./InventoryActions"
import AddCartDialog from "./AddCartDialog"


const inventoryColumnsBase: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
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

export const inventoryColumnsFull: ColumnDef<InventoryItem>[] = [
  ...inventoryColumnsBase,
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <div
        className="flex w-full justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <AddCartDialog item={row.original} />
      </div>
    ),
  },
]

export const inventoryColumnsNoCart: ColumnDef<InventoryItem>[] = [
  ...inventoryColumnsBase,
  {
    id: "actions",
    enableHiding: false,
    cell: () => (
      <InventoryActions />
    ),
  },
]
