import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { useDroppable } from '@dnd-kit/core'

import { type DropTargetData } from '../types/drag'
import { type ShelfColumn, ELEMENT_CATALOG } from '../../../types/shelf'
import { ELEMENT_WIDTH, UNIT_HEIGHT, maxColumnUnits, shelfPx } from '../util/shelfUnits'

import ShelfPiece from '../shared/ShelfElementView'

import styles from './Canvas.module.css'

// Free space (in base-height units) above the tallest column, so there's always room to drop on top
export const HEADROOM_UNITS = 4


function CanvasColumn ({ column }: { column: ShelfColumn }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { kind: 'column', columnId: column.id } satisfies DropTargetData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.columnActive : ''}`}
      style={{ width: shelfPx(ELEMENT_WIDTH) }}
    >
      {column.elements.map(element => {
        const definition = ELEMENT_CATALOG[element.type]
        return (
          <ShelfPiece
            key={element.id}
            itemDef={definition}
            draggableId={element.id}
            dragData={{ source: 'board', columnId: column.id, pieceId: element.id }}
            layoutDependency={column.elements}
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


type CanvasProps = {
  columns: ShelfColumn[];
  zoom: number;
  boardRef: RefObject<HTMLElement | null>;
  columnsRef: RefObject<HTMLDivElement | null>;
};

const Canvas = ({ columns, zoom, boardRef, columnsRef }: CanvasProps) => {
  const maxUnits = maxColumnUnits(columns)

  // Keep the view anchored to the floor when the shelf grows or shrinks vertically
  const bottomGap = useRef(0)
  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) return

    board.scrollTop = board.scrollHeight - board.clientHeight - bottomGap.current

    const onScroll = () => {
      bottomGap.current = board.scrollHeight - board.clientHeight - board.scrollTop
    }
    board.addEventListener('scroll', onScroll, { passive: true })
    return () => board.removeEventListener('scroll', onScroll)
  }, [boardRef, maxUnits])

  return (
    <section
      ref={boardRef}
      className={styles.board}
      style={{ '--shelf-scale': zoom } as CSSProperties}
    >
      <div className={styles.workspace} role="grid" aria-label="Shelf builder workspace">
        {columns.length === 0 && (
          <div className={styles.boardEmpty}>
            <span className={styles.boardEmptyText}>Drop an element to begin</span>
          </div>
        )}

        <EdgeDropZone position="left" />

        <div
          ref={columnsRef}
          className={styles.columnsArea}
          style={{ minHeight: shelfPx((maxUnits + HEADROOM_UNITS) * UNIT_HEIGHT) }}
        >
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
