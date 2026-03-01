export type BorrowState = 'pending' | 'approved' | 'returned' | 'overdue' | 'on_loan';

export interface BorrowedList {
  id: string;
  itemId: string;
  itemName: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  state: BorrowState;
}

export interface Event {
  eventName?: string;
  id: string;
  personId: string;
  createdAt?: string;
  state: "pending" | "approved" | "on_loan" | "overdue" | "returned" | "partial_overdue";
  items: BorrowedList[];
}

export interface ItemBorrowHistory {
  id: string;
  itemId: string;
  eventName: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  state: BorrowState;
  quantity: number;
}
