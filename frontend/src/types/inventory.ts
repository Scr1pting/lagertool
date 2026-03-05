import type { ApprovalState, TimeState } from "./borrowRequest"
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
  borrowHistory: ItemBorrowEvent[]
}

export interface ItemBorrowEvent {
  authorName: string
  approvalState: ApprovalState
  timeState?: TimeState
  eventName: string
  startDate: string
  endDate: string
  returnedDate?: string
  amount: number
}
