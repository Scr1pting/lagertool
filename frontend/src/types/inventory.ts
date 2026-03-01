import type { Building } from "./building"
import type { Room } from "./room"
import { type Shelf } from "./shelf"
import type { BorrowState } from "./borrow"

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
  borrowHistory?: ItemBorrowHistory[]
}

export interface ItemBorrowHistory {
  id: string;
  eventName: string;
  startDate: string;
  endDate: string;
  returnDate?: string;
  state: BorrowState;
  quantity: number;
}
