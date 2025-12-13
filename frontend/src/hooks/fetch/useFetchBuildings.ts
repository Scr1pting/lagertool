import useOrgs from "@/store/useOrgs"
import useFetch from "./useFetch"
import { type Building } from "@/types/building"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchBuildings() {
  const selectedOrg = useOrgs(s => s.selectedOrg)

  return useFetch<Building[]>(`${API_BASE_URL}/buildings_sorted?organisation=${selectedOrg?.name}`)
}

export default useFetchBuildings
