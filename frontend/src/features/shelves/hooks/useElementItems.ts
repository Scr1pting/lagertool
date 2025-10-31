import { useEffect, useState } from "react";
import getElementItems from "../api/getElementItems";
import type { ShelfElementItem } from "../../../types/shelf";

type ShelfElementItemState =
  | { status: "idle"; data: ShelfElementItem[]; error: null }
  | { status: "loading"; data: ShelfElementItem[]; error: null }
  | { status: "success"; data: ShelfElementItem[]; error: null }
  | { status: "error"; data: ShelfElementItem[]; error: Error };

const useElementItems = (elementId: string) => {
  const [state, setState] = useState<ShelfElementItemState>({
    status: "idle",
    data: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));

      try {
        const items = await getElementItems({elementId});
        if (!cancelled) {
          setState({ status: "success", data: items, error: null });
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

export default useElementItems;
