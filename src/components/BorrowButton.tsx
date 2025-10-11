import { Link, useLocation } from 'react-router-dom';
import styles from './NavBar.module.css';

export default function BorrowButton({ counterValue = null }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const targetPath = isHome ? '/borrowed' : '/';

  return (
    <Link to={targetPath}>
      <button type="button" className={`${styles.input} ${styles.buttonBorrow}`}>
        <span className={styles.borrowLabel}>Borrowed</span>
        {counterValue != null &&
          <span className={styles.placeholder} aria-hidden="true">
            {counterValue}
          </span>
        }
      </button>
    </Link>
  );
}

