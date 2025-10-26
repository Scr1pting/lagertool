import styles from './RegularPage.module.css';

interface RegularPageProps {
  title: string;
  children: React.ReactNode;
}

function RegularPage({ title, children }: RegularPageProps) {
  return (
    <main className={styles.mainWrapper}>
      <h1 className={styles.title}>{title}</h1>
      {children}
    </main>
  );
}

export default RegularPage;
