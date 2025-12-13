import type { Shelf, ShelfElement } from '@/types/shelf';
import styles from './StaticShelf.module.css';
import StaticShelfColumn from './StaticShelfColumn';


interface StaticShelfParams {
  shelf : Shelf;
  onElementSelect?: (newElement: ShelfElement) => void;
  highlightedElement?: string;
}

function StaticShelf({ shelf, onElementSelect, highlightedElement }: StaticShelfParams) {
  return (
    <section className={styles.StaticShelf}>
      <div className={styles.leftElement} />
      {shelf.columns.map((column) => (
        <StaticShelfColumn
          key={column.id}
          column={column}
          shelf={shelf}
          highlightedElement={highlightedElement}
          onElementSelect={onElementSelect}
        />
      ))}
      <div className={styles.rightElement} />
    </section>
  );
};

export default StaticShelf;
