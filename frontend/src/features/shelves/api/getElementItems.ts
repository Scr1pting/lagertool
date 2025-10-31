import axios from "axios";
import { type InventoryItem } from "@/types/inventory";

type GetElementItems = {
  elementId: string;
  signal?: AbortSignal;
};

const getElementItems = async ({ elementId, signal }: GetElementItems): Promise<InventoryItem[]> => {
  try {
    const { data } = await axios.get<InventoryItem[]>(
      `${import.meta.env?.VITE_API_BASE_URL}/shelves/unit/${elementId}/inventory`,
      { signal }
    );
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

export default getElementItems;
