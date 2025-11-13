import useApi from "./useApi";
import { type InventoryItem } from "@/types/inventory";

function useFetchInventory() {
  return useApi<InventoryItem[]>('/inventory.sample.json')
}

export default useFetchInventory;
