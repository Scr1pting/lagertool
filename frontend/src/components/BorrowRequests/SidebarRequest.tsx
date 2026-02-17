import { cn } from "@/lib/cn"
import type { BorrowRequest } from "@/types/borrowRequest"
import type { Dispatch, SetStateAction } from "react"

interface SidebarRequestProps {
  request: BorrowRequest
  selectedRequest: BorrowRequest
  setSelectedRequest: Dispatch<SetStateAction<BorrowRequest>>
}

function SidebarRequest(
  { request, selectedRequest, setSelectedRequest } : SidebarRequestProps
) {
  return (
    <button
      className={cn("flex flex-col py-2 px-2.5 w-full items-start text-left", selectedRequest == request ? "rounded-lg bg-muted" : "")}
      onClick={() => setSelectedRequest(request)}
    >
      <span>{request.title}</span>
      <span className="text-sm text-muted-foreground">
        {request.author} 
      </span>
    </button>
  )
}

export default SidebarRequest
