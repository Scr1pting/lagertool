import styles from "./NavBar.module.css"
import { Boxes, ClipboardList, Ellipsis, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Link } from "react-router"
import clsx from "clsx"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export default function MoreDropdown() {
  return (
    <DropdownMenu >
      <DropdownMenuTrigger asChild>
        <button className={clsx(styles.input, styles.buttonNavGroup)}>
          <Ellipsis className={styles.navIcon} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          {/* asChild: the whole row is the link, not just its text. */}
          <DropdownMenuItem asChild>
            <Link to="/manage-inventory">
              <Boxes />
              Manage Inventory
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/borrow-requests">
              <ClipboardList />
              Borrow Requests
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" asChild>
          {/* Full page navigation: the backend redirects on to Keycloak's logout. */}
          <a href={`${API_BASE_URL}/auth/eduid/logout`}>
            <LogOut />
            Logout
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
