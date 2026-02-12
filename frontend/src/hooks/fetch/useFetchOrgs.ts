import useFetch from "./useFetch"
import { type Org } from "@/types/org"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchOrgs() {
  return useFetch<Org[]>(`${API_BASE_URL}/organisations`)
}

export default useFetchOrgs
