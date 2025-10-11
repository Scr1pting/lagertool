import {
	type ShelfColumnPayload,
	type ShelfRecord,
	type ShelfUnitPiece,
} from "./types";

const API_BASE_URL =
	import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api";
const SHELVES_ENDPOINT = `${API_BASE_URL}/shelves`;

const toStringOrNull = (value: unknown): string | null => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	return null;
};

const parsePiece = (entry: unknown): ShelfUnitPiece | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;
	const id = toStringOrNull(raw.id);
	const type = toStringOrNull(raw.type);

	if (!id || !type) {
		return null;
	}

	return {
		id,
		type,
	};
};

const parseColumn = (entry: unknown): ShelfColumnPayload | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;
	const id = toStringOrNull(raw.id);
	if (!id) {
		return null;
	}

	const elementsRaw = Array.isArray(raw.elements) ? raw.elements : [];
	const elements = elementsRaw
		.map(parsePiece)
		.filter((piece): piece is ShelfUnitPiece => piece !== null);

	return {
		id,
		elements,
	};
};

const parseShelfRecord = (entry: unknown): ShelfRecord | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;

	const id = toStringOrNull(raw.id);
	const name = toStringOrNull(raw.name);
	if (!id || !name) {
		return null;
	}

	const columnsRaw = Array.isArray(raw.columns) ? raw.columns : [];
	const columns = columnsRaw
		.map(parseColumn)
		.filter((column): column is ShelfColumnPayload => column !== null);

	return {
		id,
		name,
		building: toStringOrNull(raw.building),
		room: toStringOrNull(raw.room),
		numElements:
			typeof raw.numElements === "number" && Number.isFinite(raw.numElements)
				? raw.numElements
				: null,
		columns,
	};
};

export interface FetchShelvesOptions {
	signal?: AbortSignal;
}

const fetchShelves = async (
	options: FetchShelvesOptions = {},
): Promise<ShelfRecord[]> => {
	const response = await fetch(SHELVES_ENDPOINT, {
		method: "GET",
		signal: options.signal,
	});

	if (!response.ok) {
		throw new Error(`Failed to load shelves (HTTP ${response.status})`);
	}

	const data: unknown = await response.json();
	if (!Array.isArray(data)) {
		return [];
	}

	return data
		.map(parseShelfRecord)
		.filter((shelf): shelf is ShelfRecord => shelf !== null);
};

export default fetchShelves;
