import styles from './NavBar.module.css';

export default function BorrowButton({ placeholderText = '--' }) {
  return (
    <button type="button" className={styles.button}>
      <span className={styles.borrowLabel}>Borrow</span>
      <span className={styles.placeholder} aria-hidden="true">
        {placeholderText}
      </span>
    </button>
  );
}
