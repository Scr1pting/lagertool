import { useMemo} from "react"
import clsx from "clsx"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import styles from "./NavBar.module.css"

import useOrgs from "@/store/useOrgs"
import useFetchOrgs from "@/hooks/useFetchOrgs"
import { ChevronDown } from "lucide-react"

function Orgs() {
  const selectedId = useOrgs((s) => s.selectedOrgId ?? "")
  const setSelectedId = useOrgs((s) => s.setSelectedOrgId)
  const { status, data: orgs } = useFetchOrgs();
  
  const selectedOrg = orgs?.find((org) => org.id === selectedId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={clsx(styles.input, styles.buttonCapsule)}
          aria-label="Select organization"
        >
          { selectedOrg?.name ?? "Org" }
          <ChevronDown className={styles.navIconSecondary} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        {orgs?.length ? (
          <DropdownMenuRadioGroup
            value={selectedId}
            onValueChange={(value) => setSelectedId(value)}
          >
            {orgs.map((org) => (
              <DropdownMenuRadioItem
                key={org.id}
                value={org.id}
                className="pl-10 pr-2"
              >
                {org.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        ) : (
          <div className="pointer-events-none p-4 text-center text-sm text-muted-foreground">
            {status === "loading" ? "Loading…" : "No organizations available"}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default Orgs
