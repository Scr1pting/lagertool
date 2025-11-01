import useApi from "./useApi";
import { type Room } from "@/types/room";

function useFetchRooms() {
  return useApi<Room[]>('/rooms.sample.json')
}

export default useFetchRooms;
