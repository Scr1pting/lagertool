import axios from "axios";
import { type Shelf } from "@/types/shelf";

type GetShelvesOptions = {
  signal?: AbortSignal;
};

const SHELVES_ENDPOINT = `${import.meta.env?.VITE_API_BASE_URL}/shelves`;

const getShelves = async ({ signal }: GetShelvesOptions = {}): Promise<Shelf[]> => {
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
