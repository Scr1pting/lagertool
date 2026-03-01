import useFetch from "@/hooks/fetch/useFetch"
import type { BorrowRequest } from "@/types/borrowRequest"

function useFetchBorrowRequestsAdmin() {
  return useFetch<BorrowRequest[]>(`/borrow_requests`)
}

export default useFetchBorrowRequestsAdmin
