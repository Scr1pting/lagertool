import { APPROVAL_STATES, TIME_STATES, type BorrowRequest } from "@/types/borrowRequest"
import DataTable from "../DataTable/DataTable"
import { borrowColumns } from "../DataTable/InventoryTable/borrowColumns"
import ReviewRequest from "./dialogs/ReviewRequest"
import { cn } from "@/lib/cn"
import { Button } from "../shadcn/button"
import { ArrowUp } from "lucide-react"
import { Input } from "../shadcn/input"
import { useEffect, useRef, useState } from "react"
import { Badge } from "../shadcn/badge"
import { capitalize } from "@/lib/capitalize"
import { formatDate } from "@/lib/formatDate"
import post from "@/api/post"
import useFetchMe from "@/hooks/fetch/useFetchMe"
import useRequestMessages from "@/hooks/fetch/useRequestMessages"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// A message that was sent but isn't confirmed by a reload yet.
interface PendingMessage {
  tempId: string
  text: string
  failed?: boolean
}


interface RequestDetailProps {
  request: BorrowRequest
  showApproveReject: boolean
  onReviewed?: () => void
}

function RequestDetail({ request, showApproveReject, onReviewed }: RequestDetailProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [minHeight, setMinHeight] = useState(0)
  const { data: me } = useFetchMe()
  const { messages, reload } = useRequestMessages(request.id, request.messages)
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState<PendingMessage[]>([])

  useEffect(() => {
    function updateHeight() {
      if (sectionRef.current) {
        const top = sectionRef.current.getBoundingClientRect().top
        const parentStyle = window.getComputedStyle(sectionRef.current.parentElement!)
        const parentPaddingBottom = parseFloat(parentStyle.paddingBottom) || 0
        const parentMarginBottom = parseFloat(parentStyle.marginBottom) || 0
        setMinHeight(window.innerHeight - top - parentPaddingBottom - parentMarginBottom)
      }
    }
    updateHeight()
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [])

  // Pending bubbles go on the viewer's side.
  const viewerIsAuthor = me?.name === request.author

  async function send(text: string, tempId: string = crypto.randomUUID()) {
    setPending(prev => [...prev.filter(p => p.tempId !== tempId), { tempId, text }])
    try {
      await post(`${API_BASE_URL}/requests/${request.id}/messages`, { message: text })
    } catch {
      setPending(prev => prev.map(p => p.tempId === tempId ? { ...p, failed: true } : p))
      return
    }
    // The message is stored; if this reload fails, polling picks it up later.
    await reload().catch(() => {})
    setPending(prev => prev.filter(p => p.tempId !== tempId))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft("")
    send(text)
  }

  return (
    <section ref={sectionRef} className="flex flex-col" style={{ minHeight }}>
      <div className="flex gap-2">
        <Badge variant={APPROVAL_STATES[request.approvalState].color}>{capitalize(APPROVAL_STATES[request.approvalState].title)}</Badge>
        {request.timeState
         && <Badge variant={TIME_STATES[request.timeState].color}>
           {capitalize(TIME_STATES[request.timeState].title)}
         </Badge>}
      </div>

        <div className="flex justify-between mt-2">
          <h2 className="text-2xl font-semibold mb-1.5">{request.title}</h2>
          {/* Only unreviewed requests can be reviewed (the backend refuses others). */}
          {showApproveReject && request.approvalState === "pending" &&
            <div className="flex gap-2">
              <ReviewRequest request={request} outcome="rejected" onReviewed={onReviewed ?? (() => {})} />
              <ReviewRequest request={request} outcome="approved" onReviewed={onReviewed ?? (() => {})} />
            </div>
          }
        </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm mt-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Submitted</span>
        <span className="font-medium">{formatDate(request.creationDate)}</span>

        <span className="text-xs uppercase tracking-wider text-muted-foreground">Borrow</span>

        <span className="font-medium">
          {formatDate(request.startDate)} → {formatDate(request.endDate)}
        </span>

        <span className="text-xs uppercase tracking-wider text-muted-foreground">Author</span>
        <span className="font-medium">{request.author}</span>
      </div>

      <DataTable
        data={request.items} 
        columns={borrowColumns}
        className="mt-4"
      />
      
      <h2 className="text-xl font-semibold mt-5">Chat</h2>

      <div className="flex flex-col gap-2 mt-2">
        {messages.map(message =>
          <span
            // ids come from two tables (user messages and review notes)
            key={`${message.admin ? "a" : "u"}-${message.id}`}
            className={cn(
              "rounded-full px-3 py-1 inline-block",
              message.author == request.author ? "self-start bg-muted" : "self-end bg-[rgba(253,214,47,0.75)]"
            )}
          >
            {message.text}
          </span>
        )}
        {pending.map(message =>
          <div
            key={message.tempId}
            className={cn("flex flex-col gap-0.5", viewerIsAuthor ? "self-start items-start" : "self-end items-end")}
          >
            <span
              className={cn(
                "rounded-full px-3 py-1 inline-block bg-muted text-muted-foreground opacity-70",
                message.failed && "border border-destructive opacity-100"
              )}
            >
              {message.text}
            </span>
            {message.failed &&
              <button
                type="button"
                className="text-xs text-destructive hover:underline"
                onClick={() => send(message.text, message.tempId)}
              >
                Failed to send – retry
              </button>
            }
          </div>
        )}
      </div>

      <div className="flex-grow" />

      <form className="flex items-center gap-2.5 mt-10" onSubmit={handleSubmit}>
        <Input value={draft} onChange={e => setDraft(e.target.value)} />

        <Button
          type="submit"
          className="bg-[#ffe210] text-black hover:bg-[#ffe210]/90"
          size="icon"
          disabled={!draft.trim()}
        >
          <ArrowUp className="size-5" />
        </Button>
      </form>
    </section>
  )
}

export default RequestDetail

