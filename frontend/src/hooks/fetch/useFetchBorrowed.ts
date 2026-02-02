import { useMemo, useState } from "react"
import useFetch from "@/hooks/fetch/useFetch"
import { type Event } from "@/types/borrow"

function isEventArray(value: unknown): value is Event[] {
  return Array.isArray(value)
}

function useFetchBorrowed() {
  const [retry, setRetry] = useState(0)
  const state = useFetch<Event[]>(`/borrow.sample.json?retry=${retry}`)

  const data = useMemo(() => {
    if (!state.data) return [] as Event[]
    if (isEventArray(state.data)) return state.data
    return [] as Event[]
  }, [state.data])

  const refetch = () => setRetry(n => n + 1)

  return { ...state, data, refetch }
}

export default useFetchBorrowed
