import useFetch from "./useFetch";
import type { Shelf } from "@/types/shelf";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function useFetchShelves() {
  return useFetch<Shelf[]>(`${API_BASE_URL}/shelves`)
}

export default useFetchShelves;
