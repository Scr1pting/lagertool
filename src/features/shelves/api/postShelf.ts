import { type ShelfColumn, type ShelfElement } from "../types/shelf";

export interface SerializedShelfPiece {
	id: string;
	type: ShelfElement["type"];
	heightUnits: ShelfElement["heightUnits"];
}

export interface SerializedShelfColumn {
	num: number;
	elements: SerializedShelfPiece[];
}

export interface CreateShelfPayload {
	name: string;
	building: string;
	room: string;
	columns: SerializedShelfColumn[];
}

const SHELVES_ENDPOINT = "https://05.hackathon.ethz.ch/api/shelve";

const parseErrorMessage = async (response: Response) => {
	try {
		const data = (await response.json()) as { message?: string } | undefined;
		if (data && typeof data.message === "string" && data.message.trim().length > 0) {
			return data.message;
		}
	} catch (_error) {
		// Ignore JSON parse errors; fall back to status text.
	}

	return response.statusText || "Unknown error";
};

export const serializeColumns = (columns: ShelfColumn[]): SerializedShelfColumn[] => {
	return columns.map((column, columnIndex) => ({
		num: columnIndex,
		elements: column.elements.map((element, _) => ({
			id: element.id,
			type: element.type,
			heightUnits: element.heightUnits,
		})),
	}));
};

const postShelf = async (payload: CreateShelfPayload) => {
	const response = await fetch(SHELVES_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const message = await parseErrorMessage(response);
		throw new Error(message);
	}

	if (response.status !== 204) {
		// Ensure we drain the body for keep-alive connections.
		try {
			await response.json();
		} catch (_error) {
			await response.text().catch(() => undefined);
		}
	}
};

export default postShelf;
