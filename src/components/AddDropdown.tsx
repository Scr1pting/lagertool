import styles from "./NavBar.module.css";
import { Button } from "@/components/ui/button"
import { GrAdd } from "react-icons/gr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from "react-router-dom";

export default function AddDropdown() {
  return (
    <DropdownMenu >
      <DropdownMenuTrigger asChild>
        <Button className={styles.button}><GrAdd/></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Shelf Builder
          </DropdownMenuItem>
          <Link to="/borrow">
          <DropdownMenuItem>
            Borrow
          </DropdownMenuItem>
          </Link>
          <Link to="/locations">
          <DropdownMenuItem>
            Locations
          </DropdownMenuItem>
          </Link>
          <Link to="/add">
          <DropdownMenuItem>
            Add
          </DropdownMenuItem>
          </Link>
          <Link to="/persons">
          <DropdownMenuItem>
            Add Person
          </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
