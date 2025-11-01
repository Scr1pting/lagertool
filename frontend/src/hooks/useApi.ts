import { useEffect, useState } from 'react';
import get from '@/api/get';

type ApiState<T> =
  | { status: "idle"; data: T | null; error: null }
  | { status: "loading"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | null; error: Error };

function useApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    get(url)
      .then((res) => {
        if (isMounted) setState({ status: "success", data: res as T, error: null });
      })
      .catch((err) => {
        if (isMounted) setState({ status: "error", data: null, error: err instanceof Error ? err : new Error("Unknown error") });
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  return state;
}

export default useApi;
