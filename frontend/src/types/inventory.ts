import type { Building } from "./building"
import type { Room } from "./room"
import { type Shelf } from "./shelf"

export interface InventoryItem {
  id: number
  name: string
  tags: [string]
  amount: number
  available: number
  building: Building
  room: Room
}

export interface InventoryItemFull extends InventoryItem {
  shelf: Shelf
  shelfElementId: string
}
