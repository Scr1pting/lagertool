import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import StaticShelf from "@/features/shelves/components/StaticShelf";
import ShelfDetail from "@/pages/ShelfDetail";
import useShelves from "@/features/shelves/hooks/useShelves";

import styles from './Home.module.css';
import Carousel from "@/components/Carousel";
import ClippyChat from "@/components/ChatBot";


function Home() {
  const { status, data: shelves, error } = useShelves();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedElement, setSelectedElement] = useState<{ elementId: string; building: string; room: string; shelf: string } | null>(null);
  const shelfParam = searchParams.get("shelf");
  const elementParam = searchParams.get("element");

  const resolvedIndex = useMemo(() => {
    if (!shelves || shelves.length === 0) {
      return 0;
    }

    if (!shelfParam) {
      return 0;
    }

    const foundIndex = shelves.findIndex((shelf) => shelf.id === shelfParam);
    if (foundIndex === -1) {
      return 0;
    }

    return foundIndex;
  }, [shelfParam, shelves]);

  useEffect(() => {
    if (!shelves || shelves.length === 0) {
      return;
    }

    const fallbackShelfId = shelves[resolvedIndex]?.id;

    if (!fallbackShelfId) {
      return;
    }

    if (!shelfParam || !shelves.some((shelf) => shelf.id === shelfParam)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("shelf", fallbackShelfId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [resolvedIndex, searchParams, setSearchParams, shelfParam, shelves]);

  const handleIndexChange = useCallback(
    (index: number) => {
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

  if (status === "error") return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (status === "success" && (!shelves || shelves.length === 0)) return <p>No shelves yet.</p>;
  else if (!shelves || shelves.length === 0) return <></>;

  const selectedElementDetails = selectedElement && {
    ...selectedElement,
    elementId: selectedElement.elementId,
  };

  const shelvesContent = shelves.map((shelf) => (
    <div key={shelf.id} className={styles.content}>
      <StaticShelf
          shelf={shelf}
          onElementSelect={setSelectedElement}
          highlightedElement={shelf.id === shelfParam ? (elementParam ?? undefined) : undefined}
        />
      <label className={styles.homeLabel}>{shelf.building + " - " + shelf.room + " - " + shelf.name}</label>
    </div>
));

  return (
    <main className={styles.home}>
      <Carousel
        items={shelvesContent}
        ariaLabel="Shelf overview"
        initialIndex={resolvedIndex}
        onIndexChange={handleIndexChange}
      />

      <Dialog open={!!selectedElement} onOpenChange={(open) => !open && setSelectedElement(null)}>
        <DialogOverlay className="backdrop-blur-sm bg-black/70" />
        {selectedElementDetails && (
          <DialogContent
            showCloseButton
            className="max-w-[calc(100vw-6rem)] max-h-[calc(100vh-6rem)] h-[calc(100vh-6rem)] w-[calc(100vw-6rem)] rounded-3xl overflow-hidden p-0"
          >
            <div className="flex h-full flex-col bg-background">
              <header className="border-b px-8 py-6">
                <h2 className="text-2xl font-semibold">{selectedElementDetails.elementId} - Element Details</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {selectedElementDetails.building + " · " + selectedElementDetails.room + " · " + selectedElementDetails.shelf}
                </p>
              </header>
              <div className="flex-1 overflow-auto px-8 py-6">
                <ShelfDetail
                  elementId={selectedElementDetails.elementId}
                />
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <ClippyChat />
    </main>
  );
}

export default Home;