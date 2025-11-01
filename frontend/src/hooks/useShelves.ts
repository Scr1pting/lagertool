import useApi from "./useApi";
import type { Shelf } from "@/types/shelf";

function useRooms() {
  return useApi<Shelf[]>('/shelves.sample.json')
}

export default useRooms;
