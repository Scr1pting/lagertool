import type { BorrowRequest } from "@/types/borrowRequest"
import SidebarItem from "./SidebarRequest"
import { Separator } from "../shadcn/separator"
import { Fragment } from "react/jsx-runtime"
import type { Dispatch, SetStateAction } from "react"


interface SidebarProps {
  borrowRequests: BorrowRequest[]
  selectedRequest: BorrowRequest
  setSelectedRequest: Dispatch<SetStateAction<BorrowRequest>>
}

function Sidebar(
  { borrowRequests, selectedRequest, setSelectedRequest } : SidebarProps
) {
  return (
    <div>
      {borrowRequests.map((request, index) =>
        <Fragment key={request.id}>
          {index > 0
            && <Separator className={
              request == selectedRequest 
              || (index != 0 && borrowRequests[index-1] == selectedRequest)
              ? "opacity-0" : ""
            } />
          }
          <SidebarItem
            request={request}
            selectedRequest={selectedRequest}
            setSelectedRequest={setSelectedRequest}
          />
        </Fragment>
      )}
    </div>
  )
}

export default Sidebar
