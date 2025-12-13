import { useDroppable } from '@dnd-kit/core'

import { type DropTargetData } from '../types/drag'
import { type ShelfColumn, ELEMENT_CATALOG } from '../../../types/shelf'
import { ELEMENT_WIDTH } from '../util/shelfUnits'

import ShelfPiece from '../shared/ShelfElementView'

import styles from './Canvas.module.css'


function CanvasColumn ({ column }: { column: ShelfColumn }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { kind: 'column', columnId: column.id } satisfies DropTargetData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.columnActive : ''}`}
      style={{ width: ELEMENT_WIDTH }}
    >
      {column.elements.map(element => {
        const definition = ELEMENT_CATALOG[element.type]
        return (
          <ShelfPiece
            key={element.id}
            itemDef={definition}
            draggableId={element.id}
            dragData={{ source: 'board', columnId: column.id, pieceId: element.id }}
            data-type={element.type}
          />
        )
      })}
    </div>
  )
};


const EdgeDropZone = ({ position }: { position: 'left' | 'right' }) => {
  const { setNodeRef } = useDroppable({
    id: `edge-${position}`,
    data: { kind: 'edge', position } satisfies DropTargetData,
  })

  return <div ref={setNodeRef} className={styles.edgeDropZone} />
}


const Canvas = ({ columns }: { columns : ShelfColumn[] }) => {
  return (
    <section className={styles.board}>
      <div className={styles.workspace} role="grid" aria-label="Shelf builder workspace">
        {columns.length === 0 && (
          <div className={styles.boardEmpty}>
            <span className={styles.boardEmptyText}>Drop an element to begin</span>
          </div>
        )}

        <EdgeDropZone position="left" />

        <div className={styles.columnsArea}>
          {columns.map(column => (
            <CanvasColumn key={column.id} column={column} />
          ))}
        </div>
      
        <EdgeDropZone position="right" />
      </div>
    </section>
  )
}

export default Canvas

