import type { InventoryItemFull } from "@/types/inventory"
import useFetch from "./useFetch"

function useFetchItem() {
  return useFetch<InventoryItemFull>('/itemFull.sample.json')
}

export default useFetchItem
