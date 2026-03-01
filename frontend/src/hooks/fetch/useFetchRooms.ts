import useOrgs from "@/store/useOrgs"
import useFetch from "./useFetch"
import { type Room } from "@/types/room"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchRooms() {
  const selectedOrg = useOrgs(s => s.selectedOrg)

  return useFetch<Room[]>(`${API_BASE_URL}/organisations/${selectedOrg?.name}/rooms`)
}

export default useFetchRooms
