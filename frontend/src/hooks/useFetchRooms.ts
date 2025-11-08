import useApi from "./useApi";
import { type Room } from "@/types/room";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function useFetchRooms() {
  return useApi<Room[]>(`${API_BASE_URL}/rooms_sorted`)
}

export default useFetchRooms;
