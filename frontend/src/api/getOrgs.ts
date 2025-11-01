import axios from "axios";
import type { Org } from "@/types/org";


const getElementItems = async ({ signal }: { signal?: AbortSignal } = {}): Promise<Org[]> => {
  try {
    const { data } = await axios.get<Org[]>(
      "/org.sample.json",
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