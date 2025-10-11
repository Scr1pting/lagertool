import { type ShelfUnitDetail } from "../features/shelves/api/types";

const API_BASE_URL =
	import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api";

const SHELF_UNIT_ENDPOINT = `${API_BASE_URL}/shelves/unit`;

const normalizeString = (value: unknown): string | null => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	return null;
};

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

const pluck = (source: Record<string, unknown>, ...keys: string[]): string | null => {
	for (const key of keys) {
		const value = normalizeString(source[key]);
		if (value) {
			return value;
		}
	}
	return null;
};

const parseShelfUnitDetail = (data: unknown): ShelfUnitDetail | null => {
	if (!data || typeof data !== "object") {
		return null;
	}

	const raw = data as Record<string, unknown>;
	const shelfRaw =
		raw.shelf && typeof raw.shelf === "object"
			? (raw.shelf as Record<string, unknown>)
			: null;

	const columnRaw =
		raw.column && typeof raw.column === "object"
			? (raw.column as Record<string, unknown>)
			: null;

	const id =
		normalizeString(raw.unit_id) ??
		normalizeString(raw.id) ??
		(shelfRaw ? pluck(shelfRaw, "unit_id", "id") : null);

	if (!id) {
		return null;
	}

	const columnIndex =
		normalizeNumber(raw.column_index) ??
		normalizeNumber(raw.columnIndex) ??
		(columnRaw ? normalizeNumber(columnRaw["index"]) : null);

	const numElements =
		normalizeNumber(raw.num_elements) ??
		normalizeNumber(raw.numElements) ??
		(columnRaw
			? normalizeNumber(
					columnRaw["num_elements"] ?? columnRaw["numElements"],
				)
			: null);

	const type = pluck(raw, "type", "unit_type", "unitType");

	return {
		id,
		shelf_id:
			pluck(raw, "shelf_id", "shelfId") ??
			pluck(shelfRaw ?? {}, "id"),
		shelf_name:
			pluck(raw, "shelf_name", "shelfName") ??
			pluck(shelfRaw ?? {}, "name"),
		building:
			pluck(raw, "building") ??
			pluck(shelfRaw ?? {}, "building"),
		room:
			pluck(raw, "room") ??
			pluck(shelfRaw ?? {}, "room"),
		column_id:
			pluck(raw, "column_id", "columnId") ??
			pluck(columnRaw ?? {}, "id"),
		column_index: columnIndex,
		num_elements: numElements,
		type,
	};
};

const cache = new Map<string, Promise<ShelfUnitDetail | null>>();

const fetchShelfUnitDetail = (unitId: string): Promise<ShelfUnitDetail | null> => {
	const trimmed = unitId.trim();
	if (!trimmed) {
		return Promise.resolve(null);
	}

	const cached = cache.get(trimmed);
	if (cached) {
		return cached;
	}

	const request = (async () => {
		try {
			const response = await fetch(`${SHELF_UNIT_ENDPOINT}/${encodeURIComponent(trimmed)}`);
			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to load shelf unit ${trimmed} (HTTP ${response.status})`);
			}

			const payload: unknown = await response.json();
			return parseShelfUnitDetail(payload);
		} catch (_error) {
			return null;
		}
	})();

	cache.set(trimmed, request);
	return request;
};

export default fetchShelfUnitDetail;