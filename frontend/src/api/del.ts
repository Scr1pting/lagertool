import axios from "axios"

async function del<T>(url: string): Promise<T> {
  try {
    const { data } = await axios.delete<T>(url)
    return data
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || error.response?.data?.error || error.message)
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Unknown error")
  }
};

export default del
