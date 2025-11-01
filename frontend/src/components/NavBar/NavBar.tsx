import clsx from 'clsx';
import { Link } from "react-router-dom";
import { ShoppingCart } from 'lucide-react';
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

        <Link to="/shopping-cart" className={clsx(styles.input, styles.buttonRnd)}>
          <ShoppingCart className={styles.navIcon} />
        </Link>
      </div>
    </div>
  );
}
