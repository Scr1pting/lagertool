import type { BorrowRequest } from "@/types/borrowRequest"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../shadcn/resizable"
import Sidebar from "./Sidebar"
import RequestDetail from "./RequestDetail"
import { useState } from "react"

interface RequestTypePageProps {
  borrowRequests: BorrowRequest[]
  showApproveReject: boolean
  onReviewed?: () => void
}

function RequestTypePage({ borrowRequests, showApproveReject, onReviewed }: RequestTypePageProps) {
  // Track the selection by id so it follows refetched data; fall back to the
  // first request when the selected one left this list (e.g. after approving).
  const [selectedId, setSelectedId] = useState<number | undefined>(borrowRequests[0]?.id)
  const selectedRequest = borrowRequests.find(r => r.id === selectedId) ?? borrowRequests[0]
  const setSelectedRequest = (r: BorrowRequest) => setSelectedId(r.id)

  if (!selectedRequest) {
    return <p className="mt-6 text-sm text-muted-foreground">No requests.</p>
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="mt-2"
    >
      <ResizablePanel
        minSize="10rem"
        defaultSize="30%"
        className="pr-2.5 my-1"
      >
        <Sidebar
          borrowRequests={borrowRequests}
          selectedRequest={selectedRequest}
          setSelectedRequest={setSelectedRequest}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        minSize="25rem"
        className="pl-2.5 mt-2.5 mb-5"
      >
        <RequestDetail
          key={selectedRequest.id}
          request={selectedRequest}
          showApproveReject={showApproveReject}
          onReviewed={onReviewed}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default RequestTypePage
