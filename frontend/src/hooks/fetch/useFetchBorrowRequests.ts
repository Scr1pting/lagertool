import useFetch from "@/hooks/fetch/useFetch"
import type { BorrowRequest } from "@/types/borrowRequest"

function useFetchBorrowRequests() {
  return useFetch<BorrowRequest[]>(`/borrow_requests`)
}

export default useFetchBorrowRequests
