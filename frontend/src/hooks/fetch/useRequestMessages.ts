import { useCallback, useEffect, useRef, useState } from "react"
import get from "@/api/get"
import type { Message } from "@/types/borrowRequest"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const POLL_INTERVAL_MS = 5000

// Shape of GET /requests/:id/messages (api_objects.Message), which differs
// from the messages bundled into /borrow_requests.
interface ApiMessage {
  id: number
  authorName: string
  message: string
  isAdmin: boolean
}

// Chat messages of a borrow request, seeded with the bundled messages and
// kept fresh by polling while the tab is visible.
function useRequestMessages(requestId: number, initial: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initial)
  const currentId = useRef(requestId)

  useEffect(() => {
    currentId.current = requestId
  }, [requestId])

  const reload = useCallback(async () => {
    // The backend encodes an empty list as null.
    const res = await get<ApiMessage[] | null>(`${API_BASE_URL}/requests/${requestId}/messages`)
    if (currentId.current !== requestId) return
    setMessages((res ?? []).map(m => ({
      id: m.id,
      text: m.message,
      author: m.authorName,
      admin: m.isAdmin,
    })))
  }, [requestId])

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") reload().catch(() => {})
    }
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    document.addEventListener("visibilitychange", poll)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", poll)
    }
  }, [reload])

  return { messages, reload }
}

export default useRequestMessages
