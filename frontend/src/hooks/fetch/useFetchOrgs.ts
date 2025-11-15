import useFetch from "./useFetch";
import { type Org } from "@/types/org";

function useFetchOrgs() {
  return useFetch<Org[]>('/orgs.sample.json')
}

export default useFetchOrgs;
