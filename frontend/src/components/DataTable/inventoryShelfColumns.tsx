import type { ColumnDef } from "@tanstack/react-table"
import type { InventoryItem } from "@/types/inventory"
import SortableHeader from "./SortableHeader"
import { Button } from "../shadcn/button"
import { ShoppingCartIcon } from "lucide-react"
import AddCartDialog from "../AddCartDialog/AddCartDialog"


export const inventoryShelfColumns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
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
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <div
        className="flex w-full justify-end"
        onClick={e => e.stopPropagation()}
      >
        <AddCartDialog item={row.original}>
          <Button
            variant="outline"
            className="h-8 p-0"
          >
            Add to cart
            <ShoppingCartIcon />
          </Button>
        </AddCartDialog>
      </div>
    ),
  },
]
