import { useDate } from "@/store/useDate"
import useFetch from "./useFetch"
import { type InventoryItemFull } from "@/types/inventory"
import useOrgs from "@/store/useOrgs"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchInventory(id: number) {
  const selectedOrg = useOrgs(s => s.selectedOrg)

  const selectedRange = useDate(s => s.selectedRange)
  const startDate = selectedRange?.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  const endDate = selectedRange?.to?.toISOString().split('T')[0] || startDate

  return useFetch<InventoryItemFull>(`${API_BASE_URL}/item?organisation=${selectedOrg?.name}&id=${id}&start=${startDate}&end=${endDate}`)
}

export default useFetchInventory
