import { Link, useLocation } from 'react-router-dom';
import styles from './NavBar.module.css';

export default function BorrowButton({ counterValue = "0" }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const targetPath = isHome ? '/borrow' : '/';

  return (
    <Link className={styles.input} to={targetPath}>
      <button type="button" className={`${styles.input} ${styles.buttonBorrow}`}>
        <span className={styles.borrowLabel}>Borrow</span>
        {counterValue != null &&
          <span className={styles.placeholder} aria-hidden="true">
            {counterValue}
          </span>
        }
      </button>
    </Link>
  );
}
