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
import useFetchOrgs from "@/hooks/fetch/useFetchOrgs"
import { ChevronDown } from "lucide-react"

function OrgSelector() {
  const selectedOrg = useOrgs(s => s.selectedOrg)
  const setSelectedOrg = useOrgs(s => s.setSelectedOrg)
  const { status, data: orgs } = useFetchOrgs()
  
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
            value={selectedOrg?.name}
            onValueChange={value => setSelectedOrg({ name: value})}
          >
            {orgs.map(org => (
              <DropdownMenuRadioItem
                key={org.name}
                value={org.name}
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

export default OrgSelector
