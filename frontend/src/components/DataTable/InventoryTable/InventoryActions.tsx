import { Button } from "@/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import type { InventoryItem } from "@/types/inventory"
import type { Row } from "@tanstack/react-table"
import { MoreHorizontal, Pen, Trash2 } from "lucide-react"
import AddCartDialog from "./AddCartDialog"

interface InventoryActionsProps {
  row: Row<InventoryItem>
  showAddToCart?: boolean
}

function InventoryActions({ row, showAddToCart = true }: InventoryActionsProps) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        {showAddToCart && <AddCartDialog item={row.original} />}
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

export default InventoryActions
