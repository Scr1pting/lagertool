import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import StaticShelf from "@/components/Shelves/viewer/StaticShelf";

import Carousel from "@/components/Carousel/Carousel";
import useFetchShelves from "@/hooks/fetch/useFetchShelves";
import { Dialog } from "@/components/shadcn/dialog";
import ShelfElementDialog from "@/components/ShelfElementDialog";
import type { SelectedShelfElement, ShelfElement } from "@/types/shelf";


function Home() {
  const { status, data: shelves, error } = useFetchShelves();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedElement, setSelectedElement] = useState<SelectedShelfElement | null>(null);


  const shelfParam = searchParams.get("shelf");

  const resolvedIndex = useMemo(() => {
    if (!Array.isArray(shelves) || shelves.length === 0) return 0;
    if (!shelfParam) return 0

    const foundIndex = shelves.findIndex((shelf) => shelf.id === shelfParam);
    
    return foundIndex === -1 ? 0 : foundIndex;
  }, [shelfParam, shelves]);

  useEffect(() => {
    if (!Array.isArray(shelves) || shelves.length === 0) return;

    const fallbackShelfId = shelves[resolvedIndex]?.id;

    if (!fallbackShelfId) return;

    if (!shelfParam || !shelves.some((shelf) => shelf.id === shelfParam)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("shelf", fallbackShelfId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [resolvedIndex, searchParams, setSearchParams, shelfParam, shelves]);

  const handleIndexChange = useCallback((index: number) => {
      if (!shelves || index < 0 || index >= shelves.length) {
        return;
      }

      const selectedShelf = shelves[index];
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("shelf", selectedShelf.id);
      nextParams.delete("element");
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams, shelves],
  );

  if (status === "error")
    return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (status === "success" && (!shelves || shelves.length === 0)) 
    return <p>No shelves yet.</p>;
  if (!Array.isArray(shelves) || shelves.length === 0)
    return <></>;

  const shelvesContent = shelves.map((shelf) => (
    <div
      key={shelf.id}
      className="flex flex-col items-center gap-[30px]"
    >
      <StaticShelf
        shelf={shelf}
        onElementSelect={setSelectedElement}
      />
      <label className="text-[#BBB] font-mono">
        {shelf.buildingName + " - " + shelf.roomName + " - " + shelf.name}
      </label>
    </div>
  ));

  return (
    <main className="flex justify-center items-center min-h-[calc(100vh-180px)] my-[100px] mx-0 mb-[80px]">
      <Carousel
        items={shelvesContent}
        ariaLabel="Shelf overview"
        initialIndex={resolvedIndex}
        onIndexChange={handleIndexChange}
      />

      <Dialog open={selectedElement != null} onOpenChange={() => setSelectedElement(null)}>
        {selectedElement &&
          <ShelfElementDialog shelfElement={selectedElement} />
        }
      </Dialog>
    </main>
  );
}

export default Home;
