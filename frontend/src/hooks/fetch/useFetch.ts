import { useEffect, useState } from 'react'
import get from '@/api/get'
import type { ApiState } from '@/types/apiState'


function useFetch<T>(url: string, parser?: (res: unknown) => T) {
  const [state, setState] = useState<ApiState<T> & { refetchIndex: number }>({
    status: "idle",
    data: null,
    error: null,
    refetchIndex: 0,
  })

  useEffect(() => {
    let isMounted = true
    setState(prev => ({ ...prev, status: "loading", error: null }))
    get(url)
      .then(res => {
        if (isMounted) setState(prev => ({ ...prev, status: "success", data: parser ? parser(res) : res as T, error: null }))
      })
      .catch(err => {
        if (isMounted) setState(prev => ({ ...prev, status: "error", data: null, error: err instanceof Error ? err : new Error("Unknown error") }))
      })
    return () => {
      isMounted = false
    }
  }, [url, state.refetchIndex])

  const refetch = () => setState(prev => ({ ...prev, refetchIndex: (prev.refetchIndex || 0) + 1 }))

  return { ...state, refetch }
}

export default useFetch
