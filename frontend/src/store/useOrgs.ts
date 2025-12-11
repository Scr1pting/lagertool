import type { Org } from "@/types/org"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface OrgState {
    selectedOrg?: Org
    setSelectedOrg: (org?: Org) => void
}

const useOrgs = create<OrgState>()(
    persist(
        set => ({
            selectedOrg: undefined,
            setSelectedOrg: (org?: Org) => set({ selectedOrg: org }),
        }),
        {
            name: "lagertool.org",
        }
    )
)

export default useOrgs
