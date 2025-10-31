import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import StaticShelf from "@/features/shelves/components/StaticShelf";

import styles from './Home.module.css';
import Carousel from "@/components/Carousel";

import useApi from "@/hooks/useApi";
import getShelves from "@/features/shelves/api/getShelves";
import type { Shelf } from "@/features/shelves/types/shelf";


function Home() {
  const { status, data: shelves, error } = useApi<Shelf[]>(getShelves);
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

  if (status === "error") return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (status === "success" && (!shelves || shelves.length === 0)) return <p>No shelves yet.</p>;
  else if (!shelves || shelves.length === 0) return <></>;

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
    </main>
  );
}

export default Home;
