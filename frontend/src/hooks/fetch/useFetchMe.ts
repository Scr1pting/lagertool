import useFetch from "./useFetch"
import type { Me } from "@/types/me"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// The logged-in user, derived by the backend from the session cookie.
// An error (401) means not logged in.
function useFetchMe() {
  return useFetch<Me>(`${API_BASE_URL}/me`)
}

export default useFetchMe
