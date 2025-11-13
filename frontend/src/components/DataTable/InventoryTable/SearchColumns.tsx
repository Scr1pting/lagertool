import AddCartDialog from "@/components/AddCartDialog";
import { Button } from "@/components/shadcn/button";
import type { InventoryItem } from "@/types/inventory";
import type { ColumnDef } from "@tanstack/react-table";
import { ShoppingCartIcon } from "lucide-react";
import { inventoryColumnsBase } from "./inventoryColumnsBase";


export const searchColumns: ColumnDef<InventoryItem>[] = [
  ...inventoryColumnsBase,
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <div
        className="flex w-full justify-end"
        onClick={(e) => e.stopPropagation()}
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
