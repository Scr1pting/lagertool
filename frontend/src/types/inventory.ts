import type { ApprovalState, TimeState } from "./borrowRequest"
import type { Building } from "./building"
import type { Room } from "./room"
import { type Shelf, type ShelfElement } from "./shelf"


export interface InventoryItem {
  id: number
  name: string
  amount: number
  available: number
  building: Building
  room: Room
  shelfElementId: string
}

export interface InventoryItemFull extends InventoryItem {
  isConsumable: boolean
  shelf: Shelf
  shelfElementId: string
  borrowHistory: ItemBorrowEntry[]
}

export interface ItemBorrowEntry {
  authorName: string
  approvalState: ApprovalState
  timeState?: TimeState
  title: string
  startDate: string
  endDate: string
  returnedDate?: string
  amount: number
}

