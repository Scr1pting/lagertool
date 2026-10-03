import { type ShelfColumn, type ShelfElement } from '../../../types/shelf'
import { type DropTargetData } from '../types/drag'
import { makeId } from '../../../lib/ids'

// Pure edits on the builder's columns. Columns that end up empty are dropped.

const createColumn = (elements: ShelfElement[] = []): ShelfColumn => ({
  id: `column-${makeId()}`,
  elements,
})

const withoutEmptyColumns = (columns: ShelfColumn[]) => columns.filter(column => column.elements.length > 0)

const containsAny = (columns: ShelfColumn[], ids: ReadonlySet<string>) =>
  columns.some(column => column.elements.some(element => ids.has(element.id)))

export const allElementIds = (columns: ShelfColumn[]) =>
  columns.flatMap(column => column.elements.map(element => element.id))

export const removeElements = (columns: ShelfColumn[], ids: ReadonlySet<string>): ShelfColumn[] => {
  if (!containsAny(columns, ids)) return columns

  return withoutEmptyColumns(columns.map(column => ({
    ...column,
    elements: column.elements.filter(element => !ids.has(element.id)),
  })))
}

// Places pieces (top to bottom) on top of a column, or as a new column at an edge
export const placeElements = (
  columns: ShelfColumn[],
  pieces: ShelfElement[],
  target: DropTargetData
): ShelfColumn[] | null => {
  if (target.kind === 'remove' || pieces.length === 0) return null

  if (target.kind === 'edge') {
    const freshColumn = createColumn(pieces)
    return target.position === 'left' ? [freshColumn, ...columns] : [...columns, freshColumn]
  }

  if (!columns.some(column => column.id === target.columnId)) return null

  return columns.map(column =>
    column.id === target.columnId
      ? { ...column, elements: [...pieces, ...column.elements] }
      : column
  )
}

// Moves pieces as one stack, keeping their reading order (left to right, top to bottom)
export const moveElements = (
  columns: ShelfColumn[],
  ids: ReadonlySet<string>,
  target: DropTargetData
): ShelfColumn[] => {
  const moving = columns.flatMap(column => column.elements.filter(element => ids.has(element.id)))
  if (moving.length === 0) return columns

  // Keep emptied columns until after placing, so a target column whose pieces all move still exists
  const stripped = columns.map(column => ({
    ...column,
    elements: column.elements.filter(element => !ids.has(element.id)),
  }))

  const placed = placeElements(stripped, moving, target)
  return placed ? withoutEmptyColumns(placed) : columns
}
