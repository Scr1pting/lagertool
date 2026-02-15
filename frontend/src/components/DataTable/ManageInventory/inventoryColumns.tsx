import type { InventoryItem } from "@/types/inventory"
import type { ColumnDef } from "@tanstack/react-table"
import InventoryActions from "../InventoryTable/InventoryActions"
import { inventoryColumnsBase } from "../InventoryTable/inventoryColumnsBase"


export const inventoryColumns: ColumnDef<InventoryItem>[] = [
  ...inventoryColumnsBase,
  {
    id: "actions",
    enableHiding: false,
    cell: () => (
      <InventoryActions />
    ),
  },
]
