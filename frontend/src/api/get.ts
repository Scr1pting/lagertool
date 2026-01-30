import axios from "axios"


async function get<T>(url: string): Promise<T> {
  try {
    const { data } = await axios.get<T>(
      url
    )
    return data
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || error.message)
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Unknown error")
  }
};

export default get
