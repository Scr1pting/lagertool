import { ELEMENT_CATALOG, type ShelfColumn } from '../../../types/shelf'

export const ELEMENT_WIDTH = 130
export const SHORT_HEIGHT = ELEMENT_WIDTH * 0.4 // 0.4:1 ratio
export const TALL_HEIGHT = ELEMENT_WIDTH * 0.8 // 0.8:1 ratio
export const UNIT_HEIGHT = SHORT_HEIGHT // one base-height unit

// Shelf sizes scale with the --shelf-scale CSS variable set on an ancestor (defaults to 1)
export const shelfPx = (px: number) => `calc(${px}px * var(--shelf-scale, 1))`

// Discrete steps used to fit shelves on read-only views (largest first)
export const SHELF_SCALE_STEPS = [1, 0.75, 0.5, 0.35, 0.25]

// Builder zoom
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 1.5
export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5]
export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

export const columnUnits = (column: ShelfColumn) =>
  column.elements.reduce((sum, element) => sum + ELEMENT_CATALOG[element.type].heightUnits, 0)

export const maxColumnUnits = (columns: ShelfColumn[]) =>
  columns.reduce((max, column) => Math.max(max, columnUnits(column)), 0)
