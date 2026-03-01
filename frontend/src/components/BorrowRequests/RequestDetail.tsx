import { APPROVAL_STATES, type BorrowRequest } from "@/types/borrowRequest"
import DataTable from "../DataTable/DataTable"
import { borrowColumns } from "../DataTable/InventoryTable/borrowColumns"
import RejectRequest from "./dialogs/RejectRequest"
import ApproveRequest from "./dialogs/ApproveRequest"
import { cn } from "@/lib/cn"
import { Button } from "../shadcn/button"
import { ArrowUp } from "lucide-react"
import { Input } from "../shadcn/input"
import { useEffect, useRef, useState } from "react"
import { Badge } from "../shadcn/badge"
import { capitalize } from "@/lib/capitalize"
import { formatDate } from "@/lib/formatDate"


interface RequestDetailProps {
  request: BorrowRequest
}

function RequestDetail({ request }: RequestDetailProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [minHeight, setMinHeight] = useState(0)

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

  return (
    <section ref={sectionRef} className="flex flex-col" style={{ minHeight }}>
      <div className="flex gap-2">
        <Badge variant={APPROVAL_STATES[request.approvalState].color}>{capitalize(APPROVAL_STATES[request.approvalState].title)}</Badge>
        {request.timeState
         && <Badge variant={APPROVAL_STATES[request.approvalState].color}>
           {capitalize(APPROVAL_STATES[request.approvalState].title)}
         </Badge>}
      </div>

      <div className="flex justify-between mt-2">
        <h2 className="text-2xl font-semibold mb-1.5">{request.title}</h2>
        <div className="flex gap-2">
          <RejectRequest request={request} />
          <ApproveRequest request={request} />
        </div>
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
        {request.messages.map(message =>
          <span
            key={message.id}
            className={cn(
              "rounded-full px-3 py-1 inline-block",
              message.author == request.author ? "self-start bg-muted" : "self-end bg-[rgba(253,214,47,0.75)]"
            )}
          >
            {message.text}
          </span>
        )}
      </div>

      <div className="flex-grow" />

      <div className="flex items-center gap-2.5 mt-10">
        <Input />

        <Button
          size="icon"
        >
          <ArrowUp className="size-5" />
        </Button>
      </div>
    </section>
  )
}

export default RequestDetail

