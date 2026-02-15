import { formatDate } from "@/lib/formatDate"
import type { BorrowRequest } from "@/types/borrowRequest"

interface SidebarRequestProps {
  request: BorrowRequest
}

function SidebarRequest({ request } : SidebarRequestProps) {
  return (
    <div>
      {request.title}
      {formatDate(request.creationDate)}
    </div>
  )
}

export default SidebarRequest
