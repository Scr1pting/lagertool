import { MoreHorizontal, Pen, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import type { InventoryItem } from "@/types/inventory";
import type { ColumnDef } from "@tanstack/react-table";
import DataTableColumnHeader from "./InventoryTableSortedHeader";


 const columns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "item_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div>{row.getValue("item_name")}</div>
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = (rowA.original.building || "") + "/" + (rowA.original.room || "");
      const b = (rowB.original.building || "") + "/" + (rowB.original.room || "");
      return a.localeCompare(b);
    },
    cell: ({ row }) => {
      const building = row.original.building || "unknown";
      const room = row.original.room || "unknown";
      return <div>{building + "/" + room}</div>;
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
  },
  {
    id: "actions",
    enableHiding: false,
    cell: () => {
      return (
        <div className="flex justify-end w-full">
              <Button variant="ghost" className="h-8 w-8 p-0">
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
    },
  },
]

export default columns;
