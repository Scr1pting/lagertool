import { type ShelfElementItem } from "../types/shelf";


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

type GetElementItems = {
    elementId: string;
    signal?: AbortSignal;
};

const getElementItems = async ({ elementId, signal }: GetElementItems): Promise<ShelfElementItem[]> => {
    const response = await fetch(`${import.meta.env?.VITE_API_BASE_URL}/shelves/unit/${elementId}/inventory`, {
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
            return data as ShelfElementItem[];
        }
        throw new Error("Invalid shelves payload");
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to parse shelves response");
    }
};

export default getElementItems;
