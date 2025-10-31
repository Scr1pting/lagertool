import { type InventoryItem } from "./inventory";

export type CartItem = InventoryItem & {
  numSelected: number;
}
