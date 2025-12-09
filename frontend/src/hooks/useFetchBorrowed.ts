import useApi from "./useApi";
import { type BorrowItem } from "@/types/borrow";

function useFetchBorrowed() {
  return useApi<BorrowItem[]>('/borrow.sample.json')
}

export default useFetchBorrowed;
