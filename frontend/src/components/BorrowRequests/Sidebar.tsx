import type { BorrowRequest } from "@/types/borrowRequest"
import SidebarItem from "./SidebarRequest"
import { Separator } from "../shadcn/separator"
import { Fragment } from "react/jsx-runtime"
import { useState } from "react"

interface SidebarProps {
  borrowRequests : BorrowRequest[]
}

function Sidebar({borrowRequests} : SidebarProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)

  return (
    <div>
      {borrowRequests.map((request, index) =>
        <Fragment key={request.id}>
          {index > 0
            && request.id 
            && <Separator />}
          <SidebarItem
            request={request}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        </Fragment>
      )}
    </div>
  )
}

export default Sidebar
