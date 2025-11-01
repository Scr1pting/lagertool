import useApi from "./useApi";
import { type InventoryItem } from "@/types/inventory";

function useInventory() {
  return useApi<InventoryItem[]>('/inventory.sample.json')
}

export default useInventory;
