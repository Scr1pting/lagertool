import useApi from "./useApi";
import { type Building } from "@/types/building";

function useFetchBuildings() {
  return useApi<Building[]>('/buildings.sample.json')
}

export default useFetchBuildings;
