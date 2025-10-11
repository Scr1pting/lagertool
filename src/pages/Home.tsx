import StaticShelf from "@/features/shelves/components/StaticShelf";
import useShelves from "@/features/shelves/hooks/useShelves";
import type { Shelf } from "@/features/shelves/types/shelf";

import styles from './Home.module.css';


function Home() {
  const { status, data: shelves, error } = useShelves();

  if (status === "error") return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (status === "success" && (!shelves || shelves.length === 0)) return <p>No shelves yet.</p>;
  else if (!shelves || shelves.length === 0) return <></>;

  const firstShelf: Shelf = shelves[2];

  return <main className={styles.home}>
    <div className={styles.content}>
      <StaticShelf shelf={firstShelf} />
      <label className={styles.homeLabel}>{firstShelf.building + " - " + firstShelf.room + " - " + firstShelf.name}</label>
    </div>
  </main>;
}

export default Home;
