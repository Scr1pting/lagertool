import useFetch from "@/hooks/fetch/useFetch";
import { type Event } from "@/types/borrow";

function useFetchBorrowed() {
  return useFetch<Event[]>('/borrow.sample.json')
}

export default useFetchBorrowed;
