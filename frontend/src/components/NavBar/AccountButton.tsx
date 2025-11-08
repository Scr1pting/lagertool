import { UserRound } from 'lucide-react';
import clsx from "clsx";
import styles from "./NavBar.module.css";
import { Link } from "react-router-dom";
function AccountButton() {
    return (

        <button className={clsx(styles.input, styles.buttonRnd, styles.actionButton)}>
            <Link to="/account" aria-label="Account">
                <UserRound className={styles.navIcon} />
            </Link>

            
          
        </button>
    )

}

export default AccountButton;
