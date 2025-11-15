import useFetch from "./useFetch";
import { type Building } from "@/types/building";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function useFetchBuildings() {
  return useFetch<Building[]>(`${API_BASE_URL}/buildings_sorted`)
}

export default useFetchBuildings;
