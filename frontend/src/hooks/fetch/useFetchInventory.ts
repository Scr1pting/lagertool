import useFetch from "./useFetch"
import { type InventoryItem } from "@/types/inventory"
import useOrgs from "@/store/useOrgs"
import { useDateParams } from "@/hooks/useDateParams"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchInventory() {
  const selectedOrg = useOrgs(s => s.selectedOrg)
  const { startDate, endDate } = useDateParams()

  return useFetch<InventoryItem[]>(`${API_BASE_URL}/organisations/${selectedOrg?.name}/inventory?start=${startDate}&end=${endDate}`)
}

export default useFetchInventory
