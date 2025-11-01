import { create } from "zustand"
import { persist } from "zustand/middleware"

interface OrgState {
    selectedOrgId?: string
    setSelectedOrgId: (id?: string) => void
}

const useOrgs = create<OrgState>()(
    persist(
        (set) => ({
            selectedOrgId: undefined,
            setSelectedOrgId: (id?: string) => set({ selectedOrgId: id }),
        }),
        {
            name: "lagertool.orgs", // localStorage key
            // simple partial serialization is fine for this small shape
        }
    )
)

export default useOrgs