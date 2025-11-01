import useApi from "./useApi";
import { type Building } from "@/types/building";

function useBuilding() {
  return useApi<Building[]>('/buildings.sample.json')
}

export default useBuilding;
