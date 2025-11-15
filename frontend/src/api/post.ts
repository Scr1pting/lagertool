import axios from "axios";

async function post<T, U>(url: string, body: U): Promise<T> {
  try {
    const { data } = await axios.post<T>(url, body);
    return data;
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

export default post;
