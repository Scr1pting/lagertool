import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { useDroppable } from '@dnd-kit/core'

import { type DropTargetData } from '../types/drag'
import { type ShelfColumn, ELEMENT_CATALOG } from '../../../types/shelf'
import { ELEMENT_WIDTH, UNIT_HEIGHT, maxColumnUnits, shelfPx } from '../util/shelfUnits'

import ShelfPiece from '../shared/ShelfElementView'

import styles from './Canvas.module.css'

// Free space (in base-height units) above the tallest column, so there's always room to drop on top
export const HEADROOM_UNITS = 4

// Pointer travel before a press on empty canvas becomes a selection box
const MARQUEE_THRESHOLD = 4

type Rect = { left: number; top: number; right: number; bottom: number }

const intersects = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

type PieceClickHandler = (elementId: string, additive: boolean) => void

/**
 * Lays one gradient over the bounding box of the whole selection: every selected piece gets the
 * gradient sized to that box and shifted by its own offset, so it shows its slice of it and
 * adjacent pieces blend seamlessly. Positions are derived from the shelf data (unscaled px).
 */
function selectionGradientStyles(columns: ShelfColumn[], selectedIds: ReadonlySet<string>) {
  const pieces: { id: string; x: number; top: number; bottom: number }[] = []

  columns.forEach((column, columnIndex) => {
    let bottom = 0 // distance from the floor; elements are stored top first
    for (let index = column.elements.length - 1; index >= 0; index--) {
      const element = column.elements[index]
      const height = ELEMENT_CATALOG[element.type].heightUnits * UNIT_HEIGHT
      if (selectedIds.has(element.id)) {
        pieces.push({ id: element.id, x: columnIndex * ELEMENT_WIDTH, top: bottom + height, bottom })
      }
      bottom += height
    }
  })

  const styles = new Map<string, CSSProperties>()
  if (pieces.length === 0) return styles

  const left = Math.min(...pieces.map(piece => piece.x))
  const right = Math.max(...pieces.map(piece => piece.x)) + ELEMENT_WIDTH
  const top = Math.max(...pieces.map(piece => piece.top))
  const bottom = Math.min(...pieces.map(piece => piece.bottom))

  for (const piece of pieces) {
    styles.set(piece.id, {
      '--selection-size': `${shelfPx(right - left)} ${shelfPx(top - bottom)}`,
      '--selection-position': `${shelfPx(left - piece.x)} ${shelfPx(piece.top - top)}`,
    } as CSSProperties)
  }
  return styles
}


type CanvasColumnProps = {
  column: ShelfColumn;
  selectedIds: ReadonlySet<string>;
  selectionStyles: Map<string, CSSProperties>;
  draggedIds: ReadonlySet<string>;
  onPieceClick: PieceClickHandler;
};

function CanvasColumn ({ column, selectedIds, selectionStyles, draggedIds, onPieceClick }: CanvasColumnProps) {
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
            selected={selectedIds.has(element.id)}
            style={selectionStyles.get(element.id)}
            ghost={draggedIds.has(element.id)}
            onClick={event => onPieceClick(element.id, event.shiftKey || event.metaKey || event.ctrlKey)}
            data-type={element.type}
            data-piece-id={element.id}
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
  selectedIds: ReadonlySet<string>;
  draggedIds: ReadonlySet<string>;
  onPieceClick: PieceClickHandler;
  onSelectionChange: (ids: ReadonlySet<string>) => void;
};

const Canvas = ({
  columns,
  zoom,
  boardRef,
  columnsRef,
  selectedIds,
  draggedIds,
  onPieceClick,
  onSelectionChange,
}: CanvasProps) => {
  const maxUnits = maxColumnUnits(columns)
  const selectionStyles = useMemo(() => selectionGradientStyles(columns, selectedIds), [columns, selectedIds])

  // Box selection: press on empty canvas and drag. A plain click there clears the selection.
  // Shift/Cmd/Ctrl adds to the existing selection instead of replacing it.
  const [marquee, setMarquee] = useState<Rect | null>(null)
  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const board = boardRef.current
    if (event.button !== 0 || !board) return
    if (event.target instanceof Element && event.target.closest('[data-piece-id]')) return

    const start = { x: event.clientX, y: event.clientY }
    const additive = event.shiftKey || event.metaKey || event.ctrlKey
    const baseSelection = additive ? selectedIds : new Set<string>()
    let selecting = false

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - start.x
      const dy = moveEvent.clientY - start.y
      if (!selecting && Math.hypot(dx, dy) < MARQUEE_THRESHOLD) return
      selecting = true

      const rect: Rect = {
        left: Math.min(start.x, moveEvent.clientX),
        top: Math.min(start.y, moveEvent.clientY),
        right: Math.max(start.x, moveEvent.clientX),
        bottom: Math.max(start.y, moveEvent.clientY),
      }
      setMarquee(rect)

      const hits = [...board.querySelectorAll<HTMLElement>('[data-piece-id]')]
        .filter(piece => intersects(rect, piece.getBoundingClientRect()))
        .map(piece => piece.dataset.pieceId!)
      onSelectionChange(new Set([...baseSelection, ...hits]))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setMarquee(null)
      if (!selecting && !additive) onSelectionChange(new Set())
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

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
    <>
    <section
      ref={boardRef}
      className={styles.board}
      style={{ '--shelf-scale': zoom } as CSSProperties}
      onPointerDown={handlePointerDown}
    >
      <div className={styles.workspace} role="grid" aria-label="Shelf builder workspace">
        {columns.length === 0 && (
          <div className={styles.boardEmpty}>
            <span className={styles.boardEmptyText}>Drag a piece here to begin</span>
            <span className={styles.boardEmptyHint}>Drop on a column to stack it, beside the shelf for a new column</span>
          </div>
        )}

        <EdgeDropZone position="left" />

        <div
          ref={columnsRef}
          className={styles.columnsArea}
          style={{ minHeight: shelfPx((maxUnits + HEADROOM_UNITS) * UNIT_HEIGHT) }}
        >
          {columns.map(column => (
            <CanvasColumn
              key={column.id}
              column={column}
              selectedIds={selectedIds}
              selectionStyles={selectionStyles}
              draggedIds={draggedIds}
              onPieceClick={onPieceClick}
            />
          ))}
        </div>

        <EdgeDropZone position="right" />
      </div>
    </section>

    {/* Rendered outside the board so its fade mask doesn't apply */}
    {marquee && (
      <div
        className={styles.marquee}
        style={{
          left: marquee.left,
          top: marquee.top,
          width: marquee.right - marquee.left,
          height: marquee.bottom - marquee.top,
        }}
      />
    )}
    </>
  )
}

export default Canvas
