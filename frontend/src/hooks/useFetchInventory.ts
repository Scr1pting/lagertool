import { useDate } from "@/store/useDate";
import useApi from "./useApi";
import { type InventoryItem } from "@/types/inventory";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function useFetchInventory() {
  const selectedRange = useDate((state) => state.selectedRange);

  const startDate = selectedRange?.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  const endDate = selectedRange?.to?.toISOString().split('T')[0] || startDate;

  return useApi<InventoryItem[]>(`${API_BASE_URL}/inventory_sorted?start=${startDate}&end=${endDate}`)
}

export default useFetchInventory;
