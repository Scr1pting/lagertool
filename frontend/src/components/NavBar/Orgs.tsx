import { useMemo} from "react"
import clsx from "clsx"
import { PersonStanding } from "lucide-react"
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

function Orgs() {
  const selectedId = useOrgs((s) => s.selectedOrgId ?? "")
  const setSelectedId = useOrgs((s) => s.setSelectedOrgId)
  const { data: orgs } = useFetchOrgs();

  const selectedOrg = useMemo(() => {
    if (!orgs?.length || !selectedId) return undefined
    return orgs.find((org) => org.id === selectedId)
  }, [orgs, selectedId])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={clsx(styles.input, styles.buttonRnd, "overflow-hidden")}
          aria-label="Select organization"
        >
          {selectedOrg ? (
            <img
              src={selectedOrg.imgUrl}
              alt={selectedOrg.name}
              className="size-6 object-contain"
            />
          ) : (
            <PersonStanding className={styles.navIcon} />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="start" sideOffset={8}>
        {orgs?.length ? (
            <DropdownMenuRadioGroup
              value={selectedId}
              onValueChange={(value) => setSelectedId(value)}
              className="max-h-64 overflow-y-auto"
            >
            {orgs.map((org) => (
              <DropdownMenuRadioItem
                key={org.id}
                value={org.id}
                className="pl-10 pr-2"
              >
                <span className="flex items-center gap-3">
                  <img
                    src={org.imgUrl}
                    alt={org.name}
                    className="size-8 rounded-sm border object-contain"
                  />
                  <span className="text-sm font-medium">{org.name}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        ) : (
          <div className="pointer-events-none py-4 text-center text-sm text-muted-foreground">
            {status === "loading" ? "Loading…" : "No organizations available"}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default Orgs
