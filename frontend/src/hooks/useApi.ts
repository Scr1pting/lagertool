import { useEffect, useState } from 'react';

type ApiState<T> =
  | { status: "idle"; data: T | null; error: null }
  | { status: "loading"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | null; error: Error };

function useApi<T>(apiCall: () => Promise<T>) {
  const [state, setState] = useState<ApiState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    apiCall()
      .then((res) => {
        if (isMounted) setState({ status: "success", data: res, error: null });
      })
      .catch((err) => {
        if (isMounted) setState({ status: "error", data: null, error: err instanceof Error ? err : new Error("Unknown error") });
      });
    return () => {
      isMounted = false;
    };
  }, [apiCall]);

  return state;
}

export default useApi;
