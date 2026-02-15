import type { BorrowRequest } from "@/types/borrowRequest"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../shadcn/resizable"
import Sidebar from "./Sidebar"

interface RequestTypePageProps {
  borrowRequests : BorrowRequest[]
}

function RequestTypePage({ borrowRequests }: RequestTypePageProps) {
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="max-w-sm rounded-lg border"
    >
      <ResizablePanel>
        <Sidebar borrowRequests={borrowRequests}  />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        10
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default RequestTypePage
