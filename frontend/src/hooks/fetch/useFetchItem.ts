import useFetch from "./useFetch"
import { type InventoryItemFull, type ItemBorrowHistory } from "@/types/inventory"
import useOrgs from "@/store/useOrgs"
import { useDateParams } from "@/hooks/useDateParams"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchItem(id: number) {
  const selectedOrg = useOrgs(s => s.selectedOrg)
  const { startDate, endDate } = useDateParams()

  const itemState = useFetch<InventoryItemFull>(`${API_BASE_URL}/organisations/${selectedOrg?.name}/items/${id}?start=${startDate}&end=${endDate}`)
  const borrowHistoryState = useFetch<ItemBorrowHistory[]>(`/item-borrow-history.sample.json`)

  return {
    ...itemState,
    borrowHistory: borrowHistoryState.data || []
  }
}

export default useFetchItem
