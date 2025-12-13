import styles from "./NavBar.module.css"
import { Ellipsis } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Link } from "react-router-dom"
import clsx from "clsx"

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
            <Link to="/persons">Person Management</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
