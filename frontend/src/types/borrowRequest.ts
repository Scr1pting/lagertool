import type { InventoryItem } from "./inventory"

export type RequestState = "pending" | "approved" | "rejected"

export interface BorrowRequest {
  id: number
  title: string
  description: string
  creationDate: Date
  borrowDate: Date
  dueDate: Date
  returnedDate?: Date
  items: InventoryItem
  state: RequestState
}
