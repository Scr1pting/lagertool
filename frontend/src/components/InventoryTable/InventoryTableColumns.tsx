import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import type { InventoryItem } from "@/types/inventory";
import type { ColumnDef } from "@tanstack/react-table";
import DataTableColumnHeader from "./InventoryTableSortedHeader";


 const columns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "item_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (

      <div>{row.getValue("item_name")}</div>
    ),
  },
  {
    accessorKey: "location",
    header: () => <div>Location</div>,
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default columns;
