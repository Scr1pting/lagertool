import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import Palette from './Palette'
import Canvas, { HEADROOM_UNITS } from './Canvas'
import ZoomControls from './ZoomControls'
import useCanvasZoom from './useCanvasZoom'
import useColumnHistory from './useColumnHistory'
import HistoryControls from './HistoryControls'
import BuilderHelp from './BuilderHelp'
import { allElementIds, moveElements, placeElements, removeElements } from './shelfEdits'
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

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const EMPTY_SELECTION: ReadonlySet<string> = new Set()

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
  const [helpOpen, setHelpOpen] = useState(false)

  const [selection, setSelection] = useState<ReadonlySet<string>>(EMPTY_SELECTION)
  // Ignore stale ids (e.g. after undo removed an element)
  const selectedIds = useMemo(() => {
    const existing = new Set(allElementIds(columns))
    const valid = [...selection].filter(id => existing.has(id))
    return valid.length === selection.size ? selection : new Set(valid)
  }, [columns, selection])

  // The pieces moving with the current drag: the whole selection if the dragged piece is part of it
  const draggedIds = useMemo((): ReadonlySet<string> => {
    if (activeDrag?.source !== 'board') return EMPTY_SELECTION
    return selectedIds.has(activeDrag.pieceId) ? selectedIds : new Set([activeDrag.pieceId])
  }, [activeDrag, selectedIds])

  // A click fires on the piece after a drag ends; don't let it collapse the selection
  const justDragged = useRef(false)
  const handlePieceClick = useCallback((elementId: string, additive: boolean) => {
    if (justDragged.current) return
    setSelection(previous => {
      if (!additive) return new Set([elementId])
      const next = new Set(previous)
      if (next.has(elementId)) next.delete(elementId)
      else next.add(elementId)
      return next
    })
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

  // Where the piece was grabbed (relative to its top-left), so a resized drag preview stays under the pointer
  const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 })
  const [overCanvas, setOverCanvas] = useState(false)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Dragging never changes the selection; only clicks do
    setActiveDrag((event.active.data.current as DragItemData | undefined) ?? null)
    setOverCanvas(false)

    const pointer = event.activatorEvent as PointerEvent | null
    const grabbed = pointer?.target instanceof Element ? pointer.target.closest('[data-type]') : null
    const rect = grabbed?.getBoundingClientRect()
    setGrabOffset(pointer && rect
      ? { x: pointer.clientX - rect.left, y: pointer.clientY - rect.top }
      : { x: 0, y: 0 })
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const kind = (event.over?.data.current as DropTargetData | undefined)?.kind
    setOverCanvas(kind === 'column' || kind === 'edge')
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = event.active.data.current as DragItemData | undefined
      const overData = event.over?.data.current as DropTargetData | undefined

      setActiveDrag(null)
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 0)

      if (!activeData) return

      // Add a new piece from the palette
      if (activeData.source === 'palette') {
        if (!overData) return
        const newElement: ShelfElement = { id: makeId(), type: activeData.itemType }
        update(previousColumns => placeElements(previousColumns, [newElement], overData) ?? previousColumns)
        return
      }

      // Remove pieces dropped onto the panel or outside the drag area
      if (!overData || overData.kind === 'remove') {
        update(previousColumns => removeElements(previousColumns, draggedIds))
        return
      }

      // Move pieces
      update(previousColumns => moveElements(previousColumns, draggedIds, overData))
    },
    [update, draggedIds]
  )

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null)
  }, [])

  // Keyboard: Delete/Backspace removes the selection, Cmd/Ctrl+A selects all, Esc deselects, ? toggles help,
  // Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z or Ctrl+Y redoes.
  // Handlers are read from a ref so the listener never sees stale state between key repeats.
  const keyHandlers = useRef({ undo, redo, removeSelected: () => {}, selectAll: () => {}, dragging: false })
  keyHandlers.current = {
    undo,
    redo,
    removeSelected: () => {
      if (selectedIds.size === 0) return
      update(previousColumns => removeElements(previousColumns, selectedIds))
      setSelection(EMPTY_SELECTION)
    },
    selectAll: () => setSelection(new Set(allElementIds(columns))),
    dragging: activeDrag !== null,
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Leave typing and dialogs alone
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
      } else if (modifier && key === 'a') {
        handlers.selectAll()
      } else if (!modifier && (event.key === 'Delete' || event.key === 'Backspace')) {
        handlers.removeSelected()
      } else if (!modifier && event.key === '?') {
        setHelpOpen(open => !open)
      } else if (event.key === 'Escape') {
        setSelection(EMPTY_SELECTION)
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

    // Board pieces are dragged at the canvas zoom. Palette pieces start at their panel size and shrink
    // to the canvas size once over the canvas (never grow), scaling around the grab point.
    const style = activeDrag.source === 'board'
      ? { '--shelf-scale': zoom } as CSSProperties
      : {
          transform: `scale(${overCanvas ? Math.min(1, zoom) : 1})`,
          transformOrigin: `${grabOffset.x}px ${grabOffset.y}px`,
        }

    return (
      <div className={styles.overlay} style={style}>
        <ShelfElementViewInner itemDef={ELEMENT_CATALOG[pieceType]} />
        {draggedIds.size > 1 && <span className={styles.overlayCount}>{draggedIds.size}</span>}
      </div>
    )
  }, [activeDrag, columns, zoom, draggedIds, overCanvas, grabOffset])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
          removeCount={draggedIds.size}
          footer={panelFooter}
          footerAccessory={<BuilderHelp open={helpOpen} onOpenChange={setHelpOpen} />}
        />
        <Canvas
          columns={columns}
          zoom={zoom}
          boardRef={boardRef}
          columnsRef={columnsRef}
          selectedIds={selectedIds}
          draggedIds={draggedIds}
          onPieceClick={handlePieceClick}
          onSelectionChange={setSelection}
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
