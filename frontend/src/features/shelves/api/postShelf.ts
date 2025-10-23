import { type Shelf } from "../types/shelf";

const SHELVES_ENDPOINT = "http://localhost:8000/api/shelves";

const parseErrorMessage = async (response: Response) => {
	try {
		const data = (await response.json()) as { message?: string } | undefined;
		if (data && typeof data.message === "string" && data.message.trim().length > 0) {
			return data.message;
		}
	} catch {
		// Ignore JSON parse errors; fall back to status text.
	}

	return response.statusText || "Unknown error";
};

const postShelf = async (payload: Shelf) => {
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
		} catch {
			await response.text().catch(() => undefined);
		}
	}
};

export default postShelf;
