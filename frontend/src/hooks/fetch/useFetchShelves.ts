import useOrgs from "@/store/useOrgs"
import useFetch from "./useFetch"
import type { Shelf } from "@/types/shelf"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchShelves() {
  const selectedOrg = useOrgs(s => s.selectedOrg)

  const parse = (res: Omit<Shelf, "displayName">[]) =>   
    res
      .map(shelf => ({
        ...shelf,
        displayName: `${shelf.building.name} - ${shelf.room.name} - ${shelf.name}`,
      }))

  return useFetch<Shelf[]>(`${API_BASE_URL}/shelves?organisation=${selectedOrg?.name}`, res => parse(res as Shelf[]))
}

export default useFetchShelves
