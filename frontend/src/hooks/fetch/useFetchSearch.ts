import useFetch from "./useFetch"
import type { InventoryItem } from "@/types/inventory"
import { useDateParams } from "@/hooks/useDateParams"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchSearch(query: string) {
  const { startDate, endDate } = useDateParams()
  const trimmed = query.trim()
  const url = trimmed
    ? `${API_BASE_URL}/search/${encodeURIComponent(trimmed)}?start=${startDate}&end=${endDate}`
    : ""
  return useFetch<InventoryItem[]>(url)
}

export default useFetchSearch
