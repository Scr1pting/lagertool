import styles from "./NavBar.module.css";
import { IoEllipsisHorizontal } from "react-icons/io5";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from "react-router-dom";
import clsx from "clsx";

export default function MoreDropdown() {
  return (
    <DropdownMenu >
      <DropdownMenuTrigger asChild>
        <button className={clsx(styles.input, styles.buttonRnd)}>
          <IoEllipsisHorizontal />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link to="/add">Add new inventory</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/persons">Person Management</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/shelf-builder">Add Shelf</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
