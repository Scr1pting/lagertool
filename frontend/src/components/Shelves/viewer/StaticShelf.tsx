import type { CSSProperties } from 'react'
import type { Shelf, ShelfElement } from '@/types/shelf'
import styles from './StaticShelf.module.css'
import StaticShelfColumn from './StaticShelfColumn'


interface StaticShelfParams {
  shelf : Shelf;
  onElementSelect?: (newElement: ShelfElement) => void;
  highlightedElement?: string;
  scale?: number;  // Overrides the inherited --shelf-scale
}

// Element ids don't fit into elements below this scale
const MIN_ID_SCALE = 0.5

function StaticShelf({ shelf, onElementSelect, highlightedElement, scale }: StaticShelfParams) {
  return (
    <section
      className={styles.StaticShelf}
      style={scale === undefined ? undefined : { '--shelf-scale': scale } as CSSProperties}
    >
      <div className={styles.leftElement} />
      {(shelf.columns ?? []).map(column => (
        <StaticShelfColumn
          key={column.id}
          column={column}
          shelf={shelf}
          highlightedElement={highlightedElement}
          onElementSelect={onElementSelect}
          showIds={(scale ?? 1) >= MIN_ID_SCALE}
        />
      ))}
      <div className={styles.rightElement} />
    </section>
  )
};

export default StaticShelf
