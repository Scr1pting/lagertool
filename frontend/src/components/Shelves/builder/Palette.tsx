import { useMemo, type ReactNode } from 'react'
import { type ShelfColumn, type ShelfElementType, ELEMENT_CATALOG } from '../../../types/shelf'

import styles from './Palette.module.css'
import ShelfPiece from '../shared/ShelfElementView'

type PaletteProps = {
  columns: ShelfColumn[];
  title?: string;
  headerAction?: ReactNode;  // Shown left of the title (e.g. exit)
  footer?: ReactNode;  // Pinned to the bottom of the panel
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function Palette({ columns, title = 'New shelf', headerAction, footer }: PaletteProps) {
  const catalogEntries = useMemo(
    () => Object.entries(ELEMENT_CATALOG) as [ShelfElementType, typeof ELEMENT_CATALOG[keyof typeof ELEMENT_CATALOG]][],
    []
  )

  const elementCount = columns.reduce((sum, column) => sum + column.elements.length, 0)

  return (
    <aside className={styles.palette}>
      <header className={styles.header}>
        {headerAction}
        <h2 className={styles.title}>{title}</h2>
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Elements</h3>
        <p className={styles.hint}>Drag onto the canvas. Drop on a column to stack, or beside the shelf to start a new column.</p>

        <div className={styles.list}>
          {catalogEntries.map(([itemType, itemDef]) => (
            <ShelfPiece
              key={itemType}
              itemDef={itemDef}
              draggableId={`palette-${itemType}`}
              dragData={{ source: 'palette', itemType }}
              data-type={itemType}
              title={itemDef.label}
              aria-label={itemDef.label}
            />
          ))}
        </div>
      </section>

      <div className={styles.spacer} />

      <footer className={styles.footer}>
        <span className={styles.stats}>
          {plural(columns.length, 'column')} · {plural(elementCount, 'element')}
        </span>
        {footer}
      </footer>
    </aside>
  )
}

export default Palette
