import { type ShelfUnitInventoryItem } from "./types";

const API_BASE_URL =
	import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8000/api";

const buildEndpoint = (unitId: string) =>
	`${API_BASE_URL}/shelves/unit/${encodeURIComponent(unitId)}/inventory`;

const normalizeNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return null;
};

const normalizeString = (value: unknown): string | null => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return null;
};

const mapLoanInfo = (entry: unknown) => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;
	return {
		amount: normalizeNumber(raw.amount),
		begin: normalizeString(raw.begin),
		is_overdue: raw.is_overdue === true,
		loan_id: normalizeNumber(raw.loan_id),
		person_id: normalizeNumber(raw.person_id),
		person_name: normalizeString(raw.person_name),
		until: normalizeString(raw.until),
	};
};

const mapInventoryItem = (entry: unknown): ShelfUnitInventoryItem | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;

	return {
		inventory_id: normalizeNumber(raw.inventory_id),
		item_id: normalizeNumber(raw.item_id),
		item_name: normalizeString(raw.item_name),
		category: normalizeString(raw.category),
		amount: normalizeNumber(raw.amount),
		available: normalizeNumber(raw.available),
		borrowed: normalizeNumber(raw.borrowed),
		note: normalizeString(raw.note),
		active_loans: Array.isArray(raw.active_loans)
			? raw.active_loans
					.map(mapLoanInfo)
					.filter((loan): loan is NonNullable<ReturnType<typeof mapLoanInfo>> => loan !== null)
			: null,
	};
};

const fetchShelfUnitInventory = async (unitId: string): Promise<ShelfUnitInventoryItem[]> => {
	const response = await fetch(buildEndpoint(unitId), {
		method: "GET",
	});

	if (!response.ok) {
		throw new Error(`Failed to load inventory for unit ${unitId} (HTTP ${response.status})`);
	}

	const data: unknown = await response.json();
	if (!Array.isArray(data)) {
		return [];
	}

	return data
		.map(mapInventoryItem)
		.filter((item): item is ShelfUnitInventoryItem => item !== null);
};

export default fetchShelfUnitInventory;
