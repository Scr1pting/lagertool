import useFetch from "./useFetch";
import type { Shelf } from "@/types/shelf";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function useFetchShelvesMeta() {
  return useFetch<Shelf[]>(`${API_BASE_URL}/shelves_sorted`)
}

export default useFetchShelvesMeta;
