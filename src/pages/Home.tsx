import { useState } from "react";

import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import StaticShelf from "@/features/shelves/components/StaticShelf";
import ShelfDetail from "@/features/shelves/components/ShelfDetail";
import useShelves from "@/features/shelves/hooks/useShelves";

import styles from './Home.module.css';
import Carousel from "@/components/Carousel";


function Home() {
  const { status, data: shelves, error } = useShelves();
  const [selectedElement, setSelectedElement] = useState<{ elementId: string; building: string; room: string; shelf: string } | null>(null);

  if (status === "error") return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (status === "success" && (!shelves || shelves.length === 0)) return <p>No shelves yet.</p>;
  else if (!shelves || shelves.length === 0) return <></>;

  const selectedElementDetails = selectedElement && {
    ...selectedElement,
    elementId: selectedElement.elementId,
  };

  const shelvesContent = shelves.map((shelf) => (
    <div className={styles.content}>
      <StaticShelf
          shelf={shelf}
          onElementSelect={setSelectedElement}
        />
      <label className={styles.homeLabel}>{shelf.building + " - " + shelf.room + " - " + shelf.name}</label>
    </div>
));

  return (
    <main className={styles.home}>
      <Carousel
        items={shelvesContent}
        ariaLabel="Shelf overview"
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
    </main>
  );
}

export default Home;
