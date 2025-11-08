import { type Shelf } from "./shelf"

export interface InventoryItem {
  id: string,
  name: string;
  amount: number;
  available: number;
  buildingName: string;
  roomName: string;
  shelfId: string;
}

export interface InventoryItemFull extends InventoryItem {
  shelf: Shelf
  shelfElementId: string
}
