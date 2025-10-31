import type { ColumnDef } from "@tanstack/react-table";
import DataTableColumnHeader from "../DataTableSortedHeader";
import type { InventoryItem } from "@/types/inventory";
import InventoryActions from "./InventoryActions";


const inventoryColumns: ColumnDef<InventoryItem>[] = [
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
    cell: ({ row }) => { return <InventoryActions row={row} /> },
  },
]

export default inventoryColumns;
