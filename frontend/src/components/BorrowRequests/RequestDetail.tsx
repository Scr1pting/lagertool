import type { BorrowRequest } from "@/types/borrowRequest"
import { Button } from "@/components/shadcn/button"
import DataTable from "../DataTable/DataTable"

interface RequestDetailProps {
  request: BorrowRequest
}

function RequestDetail({ request }: RequestDetailProps) {
  return (
    <section>
      <div className="flex justify-between">
        <h2 className="text-2xl font-semibold">{request.title}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
          >
            Reject
          </Button>
          <Button variant="outline">Approve</Button>
        </div>
      </div>
      
      <p className="mt-2">
        <span className="font-bold">Description:</span> {request.description}
      </p>
    </section>
  )
}

export default RequestDetail
