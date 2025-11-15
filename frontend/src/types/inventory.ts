import { type Shelf } from "./shelf"

export interface InventoryItem {
  id: number
  name: string
  tags: [string]
  amount: number
  available: number
  buildingName: string
  roomName: string
}

export interface InventoryItemFull extends InventoryItem {
  shelf: Shelf
  shelfElementId: string
}
