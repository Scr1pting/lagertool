import type { InventoryItem } from "./inventory"

export const APPROVAL_STATES = ["pending", "approved", "rejected"] as const
export type ApprovalState = typeof APPROVAL_STATES[number]

export const TIME_STATES = ["overdue", "on loan", "returned"] as const
export type TimeState = typeof TIME_STATES[number]

export interface BorrowItem extends InventoryItem {
  borrowed: number
}

export interface BorrowRequest {
  id: number
  approvalState: ApprovalState
  timeState?: TimeState
  title: string
  author: string
  description?: string
  creationDate: Date
  borrowDate: Date
  dueDate: Date
  returnedDate?: Date
  items: BorrowItem[]
  messages: Message[]
}

export interface Message {
  id: number
  text: string
  author: string
  admin: boolean
}
