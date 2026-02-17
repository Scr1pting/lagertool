import type { InventoryItem } from "./inventory"

export type RequestState = "pending" | "approved" | "rejected"

export interface BorrowItem extends InventoryItem {
  borrowed: number
}

export interface BorrowRequest {
  id: number
  title: string
  author: string
  description?: string | null
  creationDate: Date
  borrowDate: Date
  dueDate: Date
  returnedDate?: Date
  items: BorrowItem[]
  state: RequestState
}
