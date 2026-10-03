import useFetch from "@/hooks/fetch/useFetch"
import type { BorrowRequest } from "@/types/borrowRequest"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchBorrowRequestsAdmin() {
  return useFetch<BorrowRequest[]>(`${API_BASE_URL}/borrow_requests`)
}

export default useFetchBorrowRequestsAdmin
