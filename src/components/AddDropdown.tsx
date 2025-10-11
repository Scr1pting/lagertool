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
          <DropdownMenuItem>
            Add
          </DropdownMenuItem>
          <DropdownMenuItem>
            Remove
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
