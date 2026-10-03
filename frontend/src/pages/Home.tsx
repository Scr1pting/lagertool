import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"

import StaticShelf from "@/components/Shelves/viewer/StaticShelf"

import Carousel from "@/components/Carousel/Carousel"
import useFetchShelves from "@/hooks/fetch/useFetchShelves"
import ShelfElementDialog from "@/components/ShelfElementDialog"
import type { Shelf, ShelfElement } from "@/types/shelf"
import { fitShelfScale, useShelfSpace, type ShelfSpace } from "@/components/Shelves/util/useShelfFit"

// Carousel viewport fades out the outer 10% on each side
const CAROUSEL_USABLE_WIDTH = 0.8
// Bottom margin of <main> + shelf name label and gap
const RESERVED_HEIGHT = 80 + 60


// Shelf shrunk to the largest fitting scale step; scrolls if it doesn't fit even at the smallest step
function FittedShelf({ shelf, space, onElementSelect }: {
  shelf: Shelf
  space: ShelfSpace | null
  onElementSelect: (element: ShelfElement) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scale = fitShelfScale(shelf.columns ?? [], space)

  // Start at the floor of the shelf
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [scale, space])

  return (
    <div
      ref={scrollRef}
      className="max-w-full overflow-auto"
      style={{ maxHeight: space?.height }}
    >
      <StaticShelf
        shelf={shelf}
        scale={scale}
        onElementSelect={onElementSelect}
      />
    </div>
  )
}


function Home() {
  const { status, data: shelves, error } = useFetchShelves()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedElement, setSelectedElement] = useState<ShelfElement | null>(null)

  // State instead of a ref, since <main> only mounts once the shelves have loaded
  const [mainElement, setMainElement] = useState<HTMLElement | null>(null)
  const space = useShelfSpace(mainElement, {
    widthFraction: CAROUSEL_USABLE_WIDTH,
    reservedHeight: RESERVED_HEIGHT,
  })

  const shelfParam = searchParams.get("shelf")

  const resolvedIndex = useMemo(() => {
    if (!Array.isArray(shelves) || shelves.length === 0) return 0
    if (!shelfParam) return 0

    const foundIndex = shelves.findIndex(shelf => shelf.id === shelfParam)
    
    return foundIndex === -1 ? 0 : foundIndex
  }, [shelfParam, shelves])

  useEffect(() => {
    if (!Array.isArray(shelves) || shelves.length === 0) return

    const fallbackShelfId = shelves[resolvedIndex]?.id

    if (!fallbackShelfId) return

    if (!shelfParam || !shelves.some(shelf => shelf.id === shelfParam)) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set("shelf", fallbackShelfId)
      setSearchParams(nextParams, { replace: true })
    }
  }, [resolvedIndex, searchParams, setSearchParams, shelfParam, shelves])

  const handleIndexChange = useCallback((index: number) => {
      if (!shelves || index < 0 || index >= shelves.length) {
        return
      }

      const selectedShelf = shelves[index]
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set("shelf", selectedShelf.id)
      nextParams.delete("element")
      setSearchParams(nextParams)
    },
    [searchParams, setSearchParams, shelves],
  )

  if (status === "error")
    return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>
  if (status === "success" && (!shelves || shelves.length === 0)) 
    return <p>No shelves yet.</p>
  if (!Array.isArray(shelves) || shelves.length === 0)
    return <></>

  const shelvesContent = shelves.map(shelf => (
    <div
      key={shelf.id}
      className="flex flex-col items-center gap-[30px] min-w-0 max-w-full"
    >
      <FittedShelf
        shelf={shelf}
        space={space}
        onElementSelect={setSelectedElement}
      />
      <label className="text-[#BBB] font-mono">
        {shelf.displayName}
      </label>
    </div>
  ))

  return (
    <main ref={setMainElement} className="flex justify-center items-center min-h-[calc(100vh-180px)] my-[100px] mx-0 mb-[80px]">
      <Carousel
        items={shelvesContent}
        ariaLabel="Shelf overview"
        initialIndex={resolvedIndex}
        onIndexChange={handleIndexChange}
      />

      <ShelfElementDialog 
        open={selectedElement != null}
        onOpenChange={() => setSelectedElement(null)}
        shelfElement={selectedElement}
        shelf={undefined}
      />
    </main>
  )
}

export default Home
