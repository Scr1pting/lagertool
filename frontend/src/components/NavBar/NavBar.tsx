import clsx from 'clsx';
import { Link } from "react-router-dom";
import { ShoppingCart, UserRoundIcon } from 'lucide-react';
import styles from "./NavBar.module.css";
import MoreDropdown from "./MoreDropdown";
import SearchBar from "./SearchBar";
import MiniCart from '../MiniCart';
import OrgSelector from './OrgSelector';
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

        <OrgSelector />
        <SearchBar />
        <RangeSelector />

        <div className={styles.navGroup}>
          <MiniCart
            trigger={
              <button
                type="button"
                className={clsx(styles.input, styles.buttonNavGroup)}
                aria-label="Open cart"
              >
                <ShoppingCart className={styles.navIcon} />
              </button>
            }
          />

          <Link
            className={clsx(styles.input, styles.buttonNavGroup)}
            to="/account"
            aria-label="Account"
          >
            <UserRoundIcon className={styles.navIcon} />
          </Link>

          <MoreDropdown />
        </div>
      </div>
    </div>
  );
}
