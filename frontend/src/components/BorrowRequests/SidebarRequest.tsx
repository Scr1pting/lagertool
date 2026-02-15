import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/formatDate"
import type { BorrowRequest } from "@/types/borrowRequest"
import type { Dispatch, SetStateAction } from "react"

interface SidebarRequestProps {
  request: BorrowRequest
  selectedId: number | undefined
  setSelectedId: Dispatch<SetStateAction<number | undefined>>
}

function SidebarRequest({ request, selectedId, setSelectedId } : SidebarRequestProps) {
  return (
    <button
      className={cn("flex flex-col p-2 w-full items-start text-left", selectedId == request.id ? "rounded-lg bg-muted" : "")}
      onClick={() => setSelectedId(
        selectedId == request.id ? undefined : request.id
      )}
    >
      <span>{request.title}</span>
      <span className="text-sm text-muted-foreground">{formatDate(request.creationDate)}</span>
    </button>
  )
}

export default SidebarRequest
