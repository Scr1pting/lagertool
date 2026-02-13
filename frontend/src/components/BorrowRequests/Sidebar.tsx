import type { BorrowRequest } from "@/types/borrowRequest"
import SidebarItem from "./SidebarRequest"
import { Separator } from "../shadcn/separator"
import { Fragment } from "react/jsx-runtime"

interface SidebarProps {
  borrowRequests : BorrowRequest[]
}

function Sidebar({borrowRequests} : SidebarProps) {
  return (
    <div>
      {borrowRequests.map((request, index) =>
        <Fragment key={request.id}>
          {index > 0 && <Separator />}
          <SidebarItem request={request} />
        </Fragment>
      )}
    </div>
  )
}

export default Sidebar
