import { type InventoryItem } from "./inventory"

export interface CartItem extends InventoryItem {
  amountSelected: number
}