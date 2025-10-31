import axios from "axios";
import { type Shelf } from "@/features/shelves/types/shelf";


const SHELVES_ENDPOINT = `${import.meta.env?.VITE_API_BASE_URL}/shelves`;

const getShelves = async ({ signal }: { signal?: AbortSignal } = {}): Promise<Shelf[]> => {
  try {
    const { data } = await axios.get<Shelf[]>(SHELVES_ENDPOINT, { signal });
    return data ?? [];
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || error.message);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error");
  }
};

export default getShelves;
