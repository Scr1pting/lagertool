import useFetch from "@/hooks/fetch/useFetch"
import { type BorrowRequest } from "@/types/borrowRequest"

function useFetchBorrowed() {
  return useFetch<BorrowRequest[]>(`/borrow.sample.json`)
}

export default useFetchBorrowed
