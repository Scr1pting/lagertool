import styles from "./NavBar.module.css"
import { Ellipsis } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link to="/manage-inventory">Manage Inventory</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/borrow-requests">Borrow Requests</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            {/* Full page navigation: the backend redirects on to Keycloak's logout. */}
            <a href={`${API_BASE_URL}/auth/eduid/logout`}>Logout</a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
