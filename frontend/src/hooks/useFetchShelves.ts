import useApi from "./useApi";
import type { Shelf } from "@/types/shelf";

function useFetchShelves() {
  return useApi<Shelf[]>('/shelves.sample.json')
}

export default useFetchShelves;
