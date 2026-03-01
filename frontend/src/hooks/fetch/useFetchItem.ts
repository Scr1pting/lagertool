import { useDate } from "@/store/useDate"
import useFetch from "./useFetch"
import { type InventoryItemFull, type ItemBorrowHistory } from "@/types/inventory"
import useOrgs from "@/store/useOrgs"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchItem(id: number) {
  const selectedOrg = useOrgs(s => s.selectedOrg)

  const selectedRange = useDate(s => s.selectedRange)
  const startDate = selectedRange?.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  const endDate = selectedRange?.to?.toISOString().split('T')[0] || startDate

  const itemState = useFetch<InventoryItemFull>(`${API_BASE_URL}/item?organisation=${selectedOrg?.name}&id=${id}&start=${startDate}&end=${endDate}`)
  const borrowHistoryState = useFetch<ItemBorrowHistory[]>(`/item-borrow-history.sample.json`)

  return {
    ...itemState,
    borrowHistory: borrowHistoryState.data || []
  }
}

export default useFetchItem
