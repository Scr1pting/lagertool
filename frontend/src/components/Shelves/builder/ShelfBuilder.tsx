import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import Palette from './Palette'
import Canvas, { HEADROOM_UNITS } from './Canvas'
import ZoomControls from './ZoomControls'
import useCanvasZoom from './useCanvasZoom'
import useColumnHistory from './useColumnHistory'
import HistoryControls from './HistoryControls'
import {
  ELEMENT_CATALOG,
  type ShelfColumn,
  type ShelfElement,
  type ShelfElementType,
} from '../../../types/shelf'
import { type DragItemData, type DropTargetData } from '../types/drag'
import { makeId } from '../../../lib/ids'
import { ShelfElementViewInner } from '../shared/ShelfElementView'

import styles from './ShelfBuilder.module.css'

const createColumn = (elements: ShelfElement[] = []): ShelfColumn => ({
  id: `column-${makeId()}`,
  elements,
})


// Removes an element, and its column if that ends up empty
const removeElement = (columns: ShelfColumn[], elementId: string): ShelfColumn[] => {
  if (!columns.some(column => column.elements.some(element => element.id === elementId))) {
    return columns
  }

  return columns
    .map(column => ({
      ...column,
      elements: column.elements.filter(element => element.id !== elementId),
    }))
    .filter(column => column.elements.length > 0)
}

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const placeElement = (
  columns: ShelfColumn[],
  piece: ShelfElement,
  target: DropTargetData
): ShelfColumn[] | null => {
  if (target.kind === 'remove') {
    return null
  } else if (target.kind === 'edge') {
    const freshColumn = createColumn([piece])
    return target.position === 'left' ? [freshColumn, ...columns] : [...columns, freshColumn]
  } else {
    const nextColumns: ShelfColumn[] = []
    let placed = false

    for (const column of columns) {
      if (column.id !== target.columnId) {
        nextColumns.push(column)
        continue
      }

      nextColumns.push({
        ...column,
        elements: [piece, ...column.elements],
      })
      placed = true
    }

    return placed ? nextColumns : null
  }
}

type ShelfBuilderProps = {
  columns: ShelfColumn[];
  setColumns: React.Dispatch<React.SetStateAction<ShelfColumn[]>>;
  panelHeaderAction?: ReactNode;
  panelFooter?: ReactNode;
};

function ShelfBuilder({ columns, setColumns, panelHeaderAction, panelFooter }: ShelfBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null)
  const { update, undo, redo, canUndo, canRedo } = useColumnHistory(columns, setColumns)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Ignore stale selections (e.g. after undo removed the element)
  const selectedElementId = selectedId !== null && columns.some(column =>
    column.elements.some(element => element.id === selectedId)
  ) ? selectedId : null

  // A click fires on the canvas after a drag ends; don't let it clear the selection
  const justDragged = useRef(false)
  const handleSelect = useCallback((elementId: string | null) => {
    if (justDragged.current) return
    setSelectedId(elementId)
  }, [])

  const boardRef = useRef<HTMLElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const { zoom, zoomIn, zoomOut, fitToScreen } = useCanvasZoom({
    columns,
    headroomUnits: HEADROOM_UNITS,
    boardRef,
    columnsRef,
    disabled: activeDrag !== null,
  })

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItemData | undefined
    if (!data) {
      setActiveDrag(null)
    } else {
      setActiveDrag(data)
      // Dragging a canvas piece selects it
      setSelectedId(data.source === 'board' ? data.pieceId : null)
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = event.active.data.current as DragItemData | undefined
      const overData = event.over?.data.current as DropTargetData | undefined

      setActiveDrag(null)
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 0)

      if (!activeData) {
        return
      }

      // Remove elements that are dropped onto the panel or outside the drag area
      if (!overData || overData.kind === 'remove') {
        if (activeData.source === 'board') {
          update(previousColumns => removeElement(previousColumns, activeData.pieceId))
        }
        return
      }

      // Handle moving elements from the palette into the canvas
      if (activeData.source === 'palette') {
        const newElement: ShelfElement = {
          id: makeId(),
          type: activeData.itemType,
        }

        update(previousColumns => {
          const nextColumns = placeElement(previousColumns, newElement, overData)
          if (!nextColumns) {
            return previousColumns
          }
          return nextColumns
        })
        return
      
      // Handle moving elements from one position to another
      } else {
        update(previousColumns => {
          const originColumnIndex = previousColumns.findIndex(
            column => column.id === activeData.columnId
          )
          if (originColumnIndex === -1) {
            return previousColumns
          }

          const originColumn = previousColumns[originColumnIndex]
          const elementIndex = originColumn.elements.findIndex(
            element => element.id === activeData.pieceId
          )
          if (elementIndex === -1) {
            return previousColumns
          }

          const movingPiece = originColumn.elements[elementIndex]
          const columnsWithoutPiece = previousColumns.map((column, index) =>
            index === originColumnIndex
              ? { ...column, elements: column.elements.filter(element => element.id !== movingPiece.id) }
              : column
          )

          const nextColumns = placeElement(columnsWithoutPiece, movingPiece, overData)
          return nextColumns?.filter(column => column.elements.length > 0) ?? previousColumns
        })
      }
    },
    [update]
  )

  const handleDragCancel = useCallback((_: DragCancelEvent) => {
    setActiveDrag(null)
  }, [])
  
  // Keyboard: Delete/Backspace removes the selection, Esc deselects, Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z or Ctrl+Y redoes.
  // Handlers are read from a ref so the listener never sees stale state between key repeats.
  const keyHandlers = useRef({ undo, redo, removeSelected: () => {}, dragging: false })
  keyHandlers.current = {
    undo,
    redo,
    removeSelected: () => {
      if (selectedElementId === null) return
      update(previousColumns => removeElement(previousColumns, selectedElementId))
      setSelectedId(null)
    },
    dragging: activeDrag !== null,
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Leave typing and the "Next" dialog alone
      if (isEditableTarget(event.target)) return
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return

      const handlers = keyHandlers.current
      if (handlers.dragging) return

      const modifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (modifier && key === 'z') {
        if (event.shiftKey) handlers.redo()
        else handlers.undo()
      } else if (modifier && key === 'y') {
        handlers.redo()
      } else if (!modifier && (event.key === 'Delete' || event.key === 'Backspace')) {
        handlers.removeSelected()
      } else if (event.key === 'Escape') {
        setSelectedId(null)
      } else {
        return
      }

      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const overlayNode = useMemo(() => {
    if (!activeDrag) {
      return null
    }

    const resolveType = (): ShelfElementType | null => {
      if (activeDrag.source === 'palette') {
        return activeDrag.itemType
      }

      const column = columns.find(candidate => candidate.id === activeDrag.columnId)
      const piece = column?.elements.find(candidate => candidate.id === activeDrag.pieceId)
      return piece?.type ?? null
    }

    const pieceType = resolveType()
    if (!pieceType) {
      return null
    }
    
    // Board pieces are dragged at the canvas zoom, palette pieces at their palette size
    return (
      <div style={{ '--shelf-scale': activeDrag.source === 'board' ? zoom : 1 } as CSSProperties}>
        <ShelfElementViewInner itemDef={ELEMENT_CATALOG[pieceType]} />
      </div>
    )
  }, [activeDrag, columns, zoom])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.wrapper}>
        <Palette
          columns={columns}
          headerAction={panelHeaderAction}
          headerControls={
            <HistoryControls onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
          }
          removing={activeDrag?.source === 'board'}
          footer={panelFooter}
        />
        <Canvas
          columns={columns}
          zoom={zoom}
          boardRef={boardRef}
          columnsRef={columnsRef}
          selectedId={selectedElementId}
          onSelect={handleSelect}
        />
        <ZoomControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fitToScreen}
          disabled={activeDrag !== null}
        />
      </div>

      <DragOverlay dropAnimation={null}>{overlayNode}</DragOverlay>
    </DndContext>
  )
};

export default ShelfBuilder
