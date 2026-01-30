import { useState } from 'react'
import post from '@/api/post'
import type { ApiState } from '@/types/apiState'


function usePost<T, U>() {
  const [state, setState] = useState<ApiState<T>>({
    status: "idle",
    data: null,
    error: null,
  })

  const send = async (url: string, body: U) => {
    setState(prev => ({ ...prev, status: "loading", error: null }))
    try {
      const res = await post<T, U>(url, body)
      setState({ status: "success", data: res, error: null })
    } catch (err) {
      setState({ status: "error", data: null, error: err instanceof Error ? err : new Error("Unknown error") })
    }
  }

  return { ...state, send }
}

export default usePost
