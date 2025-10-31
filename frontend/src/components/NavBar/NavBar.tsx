import clsx from 'clsx';
import { Link } from "react-router-dom";
import { TiShoppingCart } from "react-icons/ti";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import styles from "./NavBar.module.css";
import MoreDropdown from "./MoreDropdown";
import SearchBar from "./SearchBar";

export default function NavBar(){

  return(
    <div className={styles.NavBar}>
      <div className={styles.content}>
        <Link className={styles.logo} to="/" aria-label="Home">
          <img
            className="logo"
            src="/logo.webp"
            alt="Viscon logo"
          />
        </Link>

        <div className={styles.input}><SearchBar/></div>


        <MoreDropdown/>

         <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/shopping-cart" className={clsx(styles.input, styles.buttonRnd)}>
              <TiShoppingCart />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Shopping Cart</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
