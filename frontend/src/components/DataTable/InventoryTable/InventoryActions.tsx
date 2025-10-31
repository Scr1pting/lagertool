import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCart } from "@/store/useCart";
import type { InventoryItem } from "@/types/inventory";
import type { Row } from "@tanstack/react-table";
import { MoreHorizontal, Pen, Plus, Trash2 } from "lucide-react";


function InventoryActions({ row }: { row: Row<InventoryItem> }) {
  const add = useCart((state) => state.add);
  return (
    <div className="flex justify-end">
      <Button
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => {
          const inventoryItem = row.original;
          const cartItem = { ...inventoryItem, numSelected: 1 };
          add(cartItem);
        }}
      >
        <span className="sr-only">Add to cart</span>
        <Plus />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Pen className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default InventoryActions;
