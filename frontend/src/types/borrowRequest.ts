import type { InventoryItem } from "./inventory"

export const APPROVAL_STATES = {
  pending: { title: "Pending", color: "zinc" },
  approved: { title: "Approved", color: "green" },
  rejected: { title: "Rejected", color: "red" },
} as const
export type ApprovalState = keyof typeof APPROVAL_STATES

export const TIME_STATES = {
  future: { title: "Future", color: "purple" },
  onLoan: { title: "On Loan", color: "blue" },
  overdue: { title: "Overdue", color: "blue" },
  returned: { title: "Returned", color: "green" }
} as const
export type TimeState = keyof typeof APPROVAL_STATES


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
  startDate: Date
  endDate: Date
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
