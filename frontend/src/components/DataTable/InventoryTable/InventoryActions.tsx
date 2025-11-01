import { Button } from "@/components/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/shadcn/dropdown-menu";
import { useCart } from "@/store/useCart";
import type { CartItem } from "@/types/cart";
import type { InventoryItem } from "@/types/inventory";
import type { Row } from "@tanstack/react-table";
import { MoreHorizontal, Pen, Plus, Trash2 } from "lucide-react";
import AddCartDialog from "./AddCartDialog";


function InventoryActions({ row }: { row: Row<InventoryItem> }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <AddCartDialog item={row.original} />
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
