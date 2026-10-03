import useFetch from "@/hooks/fetch/useFetch"
import type { BorrowRequest } from "@/types/borrowRequest"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchBorrowRequestsPersonal() {
  return useFetch<BorrowRequest[]>(`${API_BASE_URL}/me/borrow_requests`)
}

export default useFetchBorrowRequestsPersonal
