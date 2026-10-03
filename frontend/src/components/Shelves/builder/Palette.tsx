import { useMemo, type ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Trash2 } from 'lucide-react'
import { type ShelfColumn, type ShelfElementType, ELEMENT_CATALOG } from '../../../types/shelf'

import styles from './Palette.module.css'
import ShelfPiece from '../shared/ShelfElementView'
import { type DropTargetData } from '../types/drag'
import { cn } from '@/lib/cn'

type PaletteProps = {
  columns: ShelfColumn[];
  title?: string;
  headerAction?: ReactNode;  // Shown left of the title (e.g. exit)
  headerControls?: ReactNode;  // Shown right of the title (e.g. undo/redo)
  removing?: boolean;  // A canvas piece is being dragged, so the panel acts as a remove target
  footer?: ReactNode;  // Pinned to the bottom of the panel
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function Palette({ columns, title = 'New shelf', headerAction, headerControls, removing, footer }: PaletteProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'panel-remove',
    data: { kind: 'remove' } satisfies DropTargetData,
  })

  const catalogEntries = useMemo(
    () => Object.entries(ELEMENT_CATALOG) as [ShelfElementType, typeof ELEMENT_CATALOG[keyof typeof ELEMENT_CATALOG]][],
    []
  )

  const elementCount = columns.reduce((sum, column) => sum + column.elements.length, 0)

  return (
    <aside ref={setNodeRef} className={styles.palette}>
      <header className={styles.header}>
        {headerAction}
        <h2 className={styles.title}>{title}</h2>
        {headerControls && <div className={styles.headerControls}>{headerControls}</div>}
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Elements</h3>
        <p className={styles.hint}>Drag onto the canvas. Drop on a column to stack, or beside the shelf to start a new column.</p>
        <p className={styles.hint}>To remove a piece, drag it back here or select it and press <kbd className={styles.kbd}>⌫</kbd>.</p>

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

      <div
        className={cn(styles.removeOverlay, removing && styles.removeOverlayVisible, removing && isOver && styles.removeOverlayActive)}
        aria-hidden={!removing}
      >
        <Trash2 className={styles.removeIcon} />
        <span>Release to remove</span>
      </div>
    </aside>
  )
}

export default Palette
