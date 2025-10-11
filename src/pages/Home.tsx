import StaticShelf from "@/features/shelves/components/StaticShelf";
import useShelves from "@/features/shelves/hooks/useShelves";
import type { Shelf } from "@/features/shelves/types/shelf";

function Home() {
  const { status, data: shelves, error } = useShelves();

  if (status === "loading") return <p>Loading shelves…</p>;
  if (status === "error") return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (!shelves || shelves.length === 0) return <p>No shelves yet.</p>;

  const firstShelf: Shelf = shelves[1];

  return <StaticShelf shelf={firstShelf} />;
}

export default Home;
