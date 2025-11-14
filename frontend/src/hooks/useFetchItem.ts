import type { InventoryItemFull } from "@/types/inventory";
import useApi from "./useApi";

function useFetchItem() {
  return useApi<InventoryItemFull>('/itemFull.sample.json')
}

export default useFetchItem;
