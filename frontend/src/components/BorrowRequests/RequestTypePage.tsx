import type { BorrowRequest } from "@/types/borrowRequest"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../shadcn/resizable"
import Sidebar from "./Sidebar"
import RequestDetail from "./RequestDetail"
import { useState } from "react"

interface RequestTypePageProps {
  borrowRequests: BorrowRequest[]
}

function RequestTypePage({ borrowRequests }: RequestTypePageProps) {
  const [selectedRequest, setSelectedRequest]
    = useState<BorrowRequest>(borrowRequests[0])

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
        minSize="10rem"
        className="pl-2.5 my-2.5"
      >
        <RequestDetail request={selectedRequest} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default RequestTypePage
