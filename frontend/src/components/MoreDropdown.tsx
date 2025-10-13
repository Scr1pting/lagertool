import styles from "./NavBar.module.css";
import { Button } from "@/components/ui/button"
import { IoEllipsisHorizontal } from "react-icons/io5";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from "react-router-dom";

export default function MoreDropdown() {
  return (
    <DropdownMenu >
      <DropdownMenuTrigger asChild>
        <Button className={`${styles.input} ${styles.buttonRnd}`}>
          <IoEllipsisHorizontal />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link to="/shelves">Browse Shelves</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/add">Add new inventory</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/locations">Location Management</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/persons">Person Management</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
