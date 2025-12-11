import useOrgs from "@/store/useOrgs";
import useFetch from "./useFetch";
import type { Shelf } from "@/types/shelf";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function useFetchShelvesManage() {
  const selectedOrg = useOrgs(s => s.selectedOrg)

  return useFetch<Shelf[]>(`${API_BASE_URL}/shelves_sorted?organisation=${selectedOrg?.name}`)
}

export default useFetchShelvesManage;
