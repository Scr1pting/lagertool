import type { BorrowRequest } from "@/types/borrowRequest"
import DataTable from "../DataTable/DataTable"
import { borrowColumns } from "../DataTable/InventoryTable/borrowColumns"
import RejectRequest from "./dialogs/RejectRequest"
import ApproveRequest from "./dialogs/ApproveRequest"

interface RequestDetailProps {
  request: BorrowRequest
}

function RequestDetail({ request }: RequestDetailProps) {
  return (
    <section>
      <div className="flex justify-between">
        <h2 className="text-2xl font-semibold">{request.title}</h2>
        <div className="flex gap-2">
          <RejectRequest request={request} />
          <ApproveRequest request={request} />
        </div>
      </div>
      
      <p className="mt-4">
        <span className="font-bold">Author:</span> {request.author}
      </p>

      {request.description &&
        <p className="mt-1.5">
          <span className="font-bold">Description:</span> {request.description}
        </p>
      }

      <DataTable
        data={request.items} 
        columns={borrowColumns}
        className="mt-4"
      />
    </section>
  )
}

export default RequestDetail
