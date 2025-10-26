import { useState } from 'react';

import clsx from 'clsx';
import { Link } from "react-router-dom";
import { IoAdd } from "react-icons/io5";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import styles from "./NavBar.module.css";
import MoreDropdown from "./MoreDropdown";
import SearchBar from "./SearchBar";

export default function NavBar(){
  const [borrowedCount, setBorrowedCount] = useState<string>("0")

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

        <Link className={clsx(styles.input, styles.btnCapsule)} to='/borrow'>
          <span className={styles.borrowLabel}>Borrow</span>
          {borrowedCount != null &&
            <span className={styles.badge} aria-hidden="true">
              {borrowedCount}
            </span>
          }
        </Link>

        <MoreDropdown/>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/shelf-builder" className={clsx(styles.input, styles.buttonRnd)}>
              <IoAdd />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add New Shelf</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
