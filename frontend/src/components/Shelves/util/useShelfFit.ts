import { useEffect, useState } from 'react'

import { type ShelfColumn } from '../../../types/shelf'
import { ELEMENT_WIDTH, SHELF_SCALE_STEPS, UNIT_HEIGHT, maxColumnUnits } from './shelfUnits'

const SIDE_FADE_WIDTH = 80 // StaticShelf .leftElement / .rightElement

export type ShelfSpace = { width: number; height: number }

// Largest scale step at which the shelf fits into `space`, or the smallest step if none does
export function fitShelfScale(columns: ShelfColumn[], space: ShelfSpace | null) {
  if (!space) return SHELF_SCALE_STEPS[0]

  const naturalWidth = columns.length * ELEMENT_WIDTH + 2 * SIDE_FADE_WIDTH
  const naturalHeight = maxColumnUnits(columns) * UNIT_HEIGHT

  return SHELF_SCALE_STEPS.find(step =>
    naturalWidth * step <= space.width && naturalHeight * step <= space.height
  ) ?? SHELF_SCALE_STEPS[SHELF_SCALE_STEPS.length - 1]
}

/**
 * Space available for a shelf inside `container`.
 * Width is the container width times `widthFraction` (e.g. to leave room for fades or controls),
 * height is what's left of the window below the container's top minus `reservedHeight`.
 */
export function useShelfSpace(
  container: HTMLElement | null,
  { widthFraction = 1, reservedHeight = 0 }: { widthFraction?: number; reservedHeight?: number } = {}
) {
  const [space, setSpace] = useState<ShelfSpace | null>(null)

  useEffect(() => {
    if (!container) return

    const measure = () => {
      const top = container.getBoundingClientRect().top + window.scrollY
      const next = {
        width: Math.floor(container.clientWidth * widthFraction),
        height: Math.floor(window.innerHeight - top - reservedHeight),
      }
      setSpace(previous =>
        previous?.width === next.width && previous.height === next.height ? previous : next
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [container, widthFraction, reservedHeight])

  return space
}
