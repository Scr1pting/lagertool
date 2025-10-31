import axios from "axios";
import { type Shelf } from "@/features/shelves/types/shelf";

const SHELVES_ENDPOINT = `${import.meta.env?.VITE_API_BASE_URL}/shelves`;

const postShelf = async (payload: Shelf) => {
  try {
    await axios.post(SHELVES_ENDPOINT, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
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

export default postShelf;
