import useApi from "./useApi";
import { type Org } from "@/types/org";

function useFetchOrgs() {
  return useApi<Org[]>('/orgs.sample.json')
}

export default useFetchOrgs;
