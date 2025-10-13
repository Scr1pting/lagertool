import { type ShelfElementType } from "../features/shelves/types/shelf";

export interface ShelfUnitPiece {
	id: string;
	type: ShelfElementType | string;
}

export interface ShelfColumnPayload {
	id: string;
	elements: ShelfUnitPiece[];
}

export interface CreateShelfPayload {
	id: string;
	name: string;
	building: string;
	room: string;
	columns: ShelfColumnPayload[];
}

export interface ShelfRecord {
	id: string;
	name: string;
	building?: string | null;
	room?: string | null;
	numElements?: number | null;
	columns: ShelfColumnPayload[];
}

export interface LoanInfo {
	amount?: number | null;
	begin?: string | null;
	is_overdue?: boolean | null;
	loan_id?: number | null;
	person_id?: number | null;
	person_name?: string | null;
	until?: string | null;
}

export interface ShelfUnitInventoryItem {
	inventory_id?: number | null;
	item_id?: number | null;
	item_name?: string | null;
	category?: string | null;
	amount?: number | null;
	available?: number | null;
	borrowed?: number | null;
	note?: string | null;
	active_loans?: LoanInfo[] | null;
}

export interface ShelfUnitDetail {
	id: string;
	shelf_id?: string | null;
	shelf_name?: string | null;
	building?: string | null;
	room?: string | null;
	column_id?: string | null;
	column_index?: number | null;
	num_elements?: number | null;
	type?: string | null;
}
