import { useCallback, useState } from 'react'

import { type ShelfColumn } from '../../../types/shelf'

const MAX_HISTORY = 100

// Undo/redo for the builder. All edits should go through `update` so they can be undone.
function useColumnHistory(
  columns: ShelfColumn[],
  setColumns: React.Dispatch<React.SetStateAction<ShelfColumn[]>>
) {
  const [past, setPast] = useState<ShelfColumn[][]>([])
  const [future, setFuture] = useState<ShelfColumn[][]>([])

  const update = useCallback((recipe: (columns: ShelfColumn[]) => ShelfColumn[]) => {
    const next = recipe(columns)
    if (next === columns) return

    setPast(previous => [...previous.slice(-(MAX_HISTORY - 1)), columns])
    setFuture([])
    setColumns(next)
  }, [columns, setColumns])

  const undo = useCallback(() => {
    if (past.length === 0) return

    setPast(past.slice(0, -1))
    setFuture(previous => [columns, ...previous])
    setColumns(past[past.length - 1])
  }, [past, columns, setColumns])

  const redo = useCallback(() => {
    if (future.length === 0) return

    setFuture(future.slice(1))
    setPast(previous => [...previous, columns])
    setColumns(future[0])
  }, [future, columns, setColumns])

  return { update, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 }
}

export default useColumnHistory
