export type BorrowState = 'pending' | 'approved' | 'returned' | 'overdue'| 'on_loan';

export interface BorrowItem {
  id: string;
  itemId: string;
  itemName: string;
  personId: string;
  borrowDate: string;
  returnDate: string | null; 
  state: BorrowState;
}