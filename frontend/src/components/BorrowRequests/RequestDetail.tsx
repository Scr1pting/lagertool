import { APPROVAL_STATES, TIME_STATES, type BorrowRequest } from "@/types/borrowRequest"
import DataTable from "../DataTable/DataTable"
import { borrowColumns } from "../DataTable/InventoryTable/borrowColumns"
import ReviewRequest from "./dialogs/ReviewRequest"
import RequestAction from "./dialogs/RequestAction"
import ChangeStatus from "./dialogs/ChangeStatus"
import { cn } from "@/lib/cn"
import { Button } from "../shadcn/button"
import { ArrowUp } from "lucide-react"
import { Input } from "../shadcn/input"
import { useEffect, useRef, useState } from "react"
import { Badge } from "../shadcn/badge"
import { capitalize } from "@/lib/capitalize"
import { formatDate } from "@/lib/formatDate"
import post from "@/api/post"
import useRequestMessages from "@/hooks/fetch/useRequestMessages"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// A message that was sent but isn't confirmed by a reload yet.
interface PendingMessage {
  tempId: string
  text: string
  failed?: boolean
}


// The admin actions for each stage of a request. The backend refuses
// transitions that don't match the request's current stage.
function StageActions({ request, onDone }: { request: BorrowRequest, onDone: () => void }) {
  let actions
  switch (request.approvalState) {
    case "pending":
      actions = <>
        <ReviewRequest request={request} outcome="rejected" onReviewed={onDone} />
        <ReviewRequest request={request} outcome="approved" onReviewed={onDone} />
      </>
      break
    case "rejected":
      actions = <ChangeStatus request={request} onChanged={onDone} />
      break
    case "approved":
      switch (request.timeState) {
        case "returned":
          actions = <RequestAction request={request} action="revertToBorrowed" onDone={onDone} />
          break
        case "onLoan":
        case "overdue":
          actions = <>
            <RequestAction request={request} action="revertToNotBorrowed" onDone={onDone} />
            <RequestAction request={request} action="returned" onDone={onDone} />
          </>
          break
        default:
          actions = <>
            <RequestAction request={request} action="revertToPending" onDone={onDone} />
            <RequestAction request={request} action="pickedUp" onDone={onDone} />
          </>
      }
  }
  return <div className="flex gap-2">{actions}</div>
}


const BUBBLE = "rounded-full px-3 py-1 inline-block text-[15px]"
// Brand yellow over the dark background: warm but quiet, and the light text stays readable.
const OWN_BUBBLE = "bg-brand/20"


interface RequestDetailProps {
  request: BorrowRequest
  showApproveReject: boolean
  // Shown on the admin borrow requests page: messages sent here are admin messages.
  asAdmin: boolean
  onReviewed?: () => void
}

function RequestDetail({ request, showApproveReject, asAdmin, onReviewed }: RequestDetailProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [minHeight, setMinHeight] = useState(0)
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

  async function send(text: string, tempId: string = crypto.randomUUID()) {
    setPending(prev => [...prev.filter(p => p.tempId !== tempId), { tempId, text }])
    try {
      await post(`${API_BASE_URL}/requests/${request.id}/messages`, { message: text, asAdmin })
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
          {showApproveReject && <StageActions request={request} onDone={onReviewed ?? (() => {})} />}
        </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm mt-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Submitted</span>
        <span className="font-medium">{formatDate(request.creationDate)}</span>

        <span className="text-xs uppercase tracking-wider text-muted-foreground">Requested</span>
        <span className="font-medium">
          {formatDate(request.startDate)} → {formatDate(request.endDate)}
        </span>

        {/* The actual borrow period: just the pickup until the items are back. */}
        {request.pickedUpDate && (request.timeState === "returned" && request.returnedDate
          ? <>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Borrowed</span>
            <span className="font-medium">
              {formatDate(request.pickedUpDate)} → {formatDate(request.returnedDate)}
            </span>
          </>
          : <>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Pickup</span>
            <span className="font-medium">{formatDate(request.pickedUpDate)}</span>
          </>
        )}

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
              BUBBLE,
              // Your side on the right: admin messages on the borrow requests page, requester messages on the account page.
              message.admin === asAdmin ? cn("self-end", OWN_BUBBLE) : "self-start bg-muted"
            )}
          >
            {message.text}
          </span>
        )}
        {pending.map(message =>
          <div
            key={message.tempId}
            className="flex flex-col gap-0.5 self-end items-end"
          >
            <span
              className={cn(
                BUBBLE,
                OWN_BUBBLE,
                "opacity-70",
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
          className="bg-brand text-black hover:bg-brand/90"
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

