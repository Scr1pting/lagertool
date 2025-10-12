import { useState } from "react";

import StaticShelf from "@/features/shelves/components/StaticShelf";
import useShelves from "@/features/shelves/hooks/useShelves";
import ClippyChat from '../components/ChatBot.tsx'

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
      <ClippyChat></ClippyChat>
    </main>

  );
}

export default Home;
