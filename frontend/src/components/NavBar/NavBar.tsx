import clsx from 'clsx';
import { Link } from "react-router-dom";
import { ShoppingCart } from 'lucide-react';
import styles from "./NavBar.module.css";
import MoreDropdown from "./MoreDropdown";
import SearchBar from "./SearchBar";
import MiniCart from '../MiniCart';
import Org from './Orgs';
import RangeSelector from './RangeSelector';

export default function NavBar() {

  return (
    <div className={styles.NavBar}>
      <div className={styles.content}>
        <Link className={styles.logo} to="/" aria-label="Home">
          <img
            className="logo"
            src="/logo.webp"
            alt="Viscon logo"
          />
        </Link>

        <div className={styles.input}><SearchBar /></div>

        
        <RangeSelector />
        <MiniCart
          trigger={
            <button
              type="button"
              className={clsx(styles.input, styles.buttonRnd)}
              aria-label="Open cart"
            >
              <ShoppingCart className={styles.navIcon} />
            </button>
          }
        />
        <Org />
        <MoreDropdown />
        
      </div>
    </div>
  );
}
