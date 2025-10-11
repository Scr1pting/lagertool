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
            <Link to="/shelf-builder">Shelf Builder</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/borrow">Borrow Inventory</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/events">Events</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/borrow">Borrow Inventory</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/add">Track inventory</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/persons">Personen Management</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
