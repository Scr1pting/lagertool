import { type Shelf } from "../types/shelf";

const SHELVES_ENDPOINT = `${import.meta.env?.VITE_API_BASE_URL}/api/shelves`;

type GetShelvesOptions = {
	signal?: AbortSignal;
};

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

const getShelves = async ({ signal }: GetShelvesOptions = {}): Promise<Shelf[]> => {
	const response = await fetch(SHELVES_ENDPOINT, {
		method: "GET",
		headers: {
			"Accept": "application/json",
		},
		signal,
	});

	if (!response.ok) {
		const message = await parseErrorMessage(response);
		throw new Error(message);
	}

	if (response.status === 204) {
		return [];
	}

	try {
		const data = (await response.json()) as unknown;
		if (Array.isArray(data)) {
			return data as Shelf[];
		}
		throw new Error("Invalid shelves payload");
	} catch (error: unknown) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("Failed to parse shelves response");
	}
};

export default getShelves;
