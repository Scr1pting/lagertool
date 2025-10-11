import { Link, useLocation } from 'react-router-dom';
import styles from './NavBar.module.css';

export default function BorrowButton({ placeholderText = '--' }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const targetPath = isHome ? '/borrowed' : '/';
  const label = isHome ? 'Borrowed' : 'Back';

  return (
    <Link to={targetPath}>
      <button type="button" className={styles.button}>
        <span className={styles.borrowLabel}>{label}</span>
        {isHome && (
          <span className={styles.placeholder} aria-hidden="true">
            {placeholderText}
          </span>
        )}
      </button>
    </Link>
  );
}

