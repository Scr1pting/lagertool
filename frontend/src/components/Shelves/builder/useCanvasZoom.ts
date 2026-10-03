import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

import { type ShelfColumn } from '../../../types/shelf'
import {
  ELEMENT_WIDTH,
  UNIT_HEIGHT,
  ZOOM_STEPS,
  clampZoom,
  maxColumnUnits,
} from '../util/shelfUnits'

const EDGE_ZONE_WIDTH = 90 // .edgeDropZone min-width
const FLOOR_SPACE = 67 // .workspace padding-bottom + floor border
const WHEEL_SENSITIVITY = 0.01
const MAX_WHEEL_DELTA = 30 // Keeps mouse wheel notches from jumping too far

type Point = { x: number; y: number }

type UseCanvasZoomParams = {
  columns: ShelfColumn[];
  headroomUnits: number;
  boardRef: RefObject<HTMLElement | null>;
  columnsRef: RefObject<HTMLDivElement | null>;
  disabled: boolean;
};

function useCanvasZoom({ columns, headroomUnits, boardRef, columnsRef, disabled }: UseCanvasZoomParams) {
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(zoom)

  // Applies a new zoom while keeping the shelf point under `anchor` (client coords) in place.
  // Positions are measured relative to the columns area, since the edge drop zones don't scale.
  const zoomTo = useCallback((nextZoom: number, anchor?: Point) => {
    const board = boardRef.current
    const columnsArea = columnsRef.current
    const previousZoom = zoomRef.current
    const clamped = clampZoom(nextZoom)
    if (clamped === previousZoom) return

    if (!board || !columnsArea) {
      zoomRef.current = clamped
      setZoom(clamped)
      return
    }

    const boardRect = board.getBoundingClientRect()
    const point = anchor ?? {
      x: boardRect.left + boardRect.width / 2,
      y: boardRect.top + boardRect.height / 2,
    }

    const before = columnsArea.getBoundingClientRect()
    const shelfX = (point.x - before.left) / previousZoom
    const shelfY = (before.bottom - point.y) / previousZoom // measured up from the floor

    zoomRef.current = clamped
    flushSync(() => setZoom(clamped))

    const after = columnsArea.getBoundingClientRect()
    board.scrollLeft += after.left + shelfX * clamped - point.x
    board.scrollTop += after.bottom - shelfY * clamped - point.y
  }, [boardRef, columnsRef])

  const zoomIn = useCallback(() => {
    const next = ZOOM_STEPS.find(step => step > zoomRef.current + 0.001)
    if (next) zoomTo(next)
  }, [zoomTo])

  const zoomOut = useCallback(() => {
    const next = [...ZOOM_STEPS].reverse().find(step => step < zoomRef.current - 0.001)
    if (next) zoomTo(next)
  }, [zoomTo])

  const resetZoom = useCallback(() => zoomTo(1), [zoomTo])

  const fitToScreen = useCallback(() => {
    const board = boardRef.current
    if (!board || columns.length === 0) return

    const fitWidth = (board.clientWidth - 2 * EDGE_ZONE_WIDTH) / (columns.length * ELEMENT_WIDTH)
    const fitHeight = (board.clientHeight - FLOOR_SPACE) / ((maxColumnUnits(columns) + headroomUnits) * UNIT_HEIGHT)

    zoomRef.current = clampZoom(Math.min(fitWidth, fitHeight, 1))
    flushSync(() => setZoom(zoomRef.current))

    // Center horizontally, rest on the floor
    board.scrollLeft = (board.scrollWidth - board.clientWidth) / 2
    board.scrollTop = board.scrollHeight - board.clientHeight
  }, [boardRef, columns, headroomUnits])

  // Ctrl/Cmd + wheel (and trackpad pinch, which sets ctrlKey) zooms; plain wheel scrolls natively.
  // Attached natively since React's onWheel is passive and can't prevent the browser zoom.
  useEffect(() => {
    const board = boardRef.current
    if (!board) return

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      if (disabled) return

      const lineScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1
      const delta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, event.deltaY * lineScale))
      zoomTo(zoomRef.current * Math.exp(-delta * WHEEL_SENSITIVITY), { x: event.clientX, y: event.clientY })
    }

    board.addEventListener('wheel', onWheel, { passive: false })
    return () => board.removeEventListener('wheel', onWheel)
  }, [boardRef, disabled, zoomTo])

  // Cmd/Ctrl + "+", "-", "0"
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      if (disabled) return

      if (event.key === '+' || event.key === '=') zoomIn()
      else if (event.key === '-') zoomOut()
      else if (event.key === '0') resetZoom()
      else return

      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disabled, zoomIn, zoomOut, resetZoom])

  return { zoom, zoomIn, zoomOut, resetZoom, fitToScreen }
}

export default useCanvasZoom
