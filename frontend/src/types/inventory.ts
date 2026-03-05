import type { ApprovalState, TimeState } from "./borrowRequest"
import type { Building } from "./building"
import type { Room } from "./room"
import { type Shelf, type ShelfElement } from "./shelf"


export interface InventoryItem {
  id: number
  name: string
  keywords: string
  amount: number
  available: number
  building: Building
  room: Room
}

export interface InventoryItemFull extends InventoryItem {
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

export interface InventoryItemPayload {
  name: string
  keywords: string
  amount: number
  shelf: Shelf | undefined
  shelfElement: ShelfElement | undefined
}
