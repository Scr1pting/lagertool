import { useEffect, useState } from "react";
import getShelves from "../api/getShelves";
import type { Shelf } from "../../../types/shelf";

type ShelvesState =
  | { status: "idle"; data: Shelf[]; error: null }
  | { status: "loading"; data: Shelf[]; error: null }
  | { status: "success"; data: Shelf[]; error: null }
  | { status: "error"; data: Shelf[]; error: Error };

const useShelves = () => {
  const [state, setState] = useState<ShelvesState>({
    status: "idle",
    data: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));

      try {
        const shelves = await getShelves();
        if (!cancelled) {
          setState({ status: "success", data: shelves, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            data: [],
            error: error instanceof Error ? error : new Error("Unknown error"),
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

export default useShelves;
