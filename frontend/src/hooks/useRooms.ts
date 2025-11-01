import useApi from "./useApi";
import { type Room } from "@/types/room";

function useRooms() {
  return useApi<Room[]>('/rooms.sample.json')
}

export default useRooms;
