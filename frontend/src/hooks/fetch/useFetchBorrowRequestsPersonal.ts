import useFetch from "@/hooks/fetch/useFetch"
import type { BorrowRequest } from "@/types/borrowRequest"

function useFetchBorrowRequestsPersonal() {
  return useFetch<BorrowRequest[]>(`/borrow_requests`)
}

export default useFetchBorrowRequestsPersonal
