import useFetch from "@/hooks/fetch/useFetch";
import { type BorrowItem } from "@/types/borrow";

function useFetchBorrowed() {
  return useFetch<BorrowItem[]>('/borrow.sample.json')
}

export default useFetchBorrowed;
