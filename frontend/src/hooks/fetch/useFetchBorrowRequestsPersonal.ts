import useFetch from "@/hooks/fetch/useFetch"
import type { BorrowRequest } from "@/types/borrowRequest"

function useFetchBorrowRequestsPersonal() {
  const userId = 1
  return useFetch<BorrowRequest[]>(`/borrow_requests?userId=${userId}`)
}

export default useFetchBorrowRequestsPersonal
