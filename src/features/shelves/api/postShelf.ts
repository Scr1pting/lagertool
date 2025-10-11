import { type ShelfColumn } from "../types/shelf";
import { type CreateShelfPayload, type ShelfColumnPayload } from "./types";

const API_BASE_URL =
	import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api";
const SHELVES_ENDPOINT = `${API_BASE_URL}/shelves`;

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

export const serializeColumns = (columns: ShelfColumn[]): ShelfColumnPayload[] => {
	return columns.map((column) => ({
		id: column.id,
		elements: column.elements.map((element) => ({
			id: element.id,
			type: element.type,
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
