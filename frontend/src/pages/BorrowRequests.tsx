import RequestTypePage from "@/components/BorrowRequests/RequestTypePage"
import RegularPage from "@/components/RegularPage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import useFetchBorrowRequestsAdmin from "@/hooks/fetch/useFetchBorrowRequestsAdmin"
import { Check, Clock, X } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router"

function BorrowRequests() {
  const { data: borrowRequests, refetch } = useFetchBorrowRequestsAdmin()
  // ?id=N (from an item's borrow history) opens that request in its tab.
  const [searchParams] = useSearchParams()
  const linkedId = Number(searchParams.get("id")) || undefined
  const linkedRequest = borrowRequests?.find(request => request.id === linkedId)
  const [tab, setTab] = useState<string>()
  const activeTab = tab ?? linkedRequest?.approvalState ?? "pending"
  
  return (
    <RegularPage title="Borrow Requests" noBottomPadding>
      <Tabs value={activeTab} onValueChange={setTab}>
      <TabsList>
          <TabsTrigger value="pending">
            <Clock />
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved">
            <Check />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <X />
            Rejected
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage
                borrowRequests={
                  borrowRequests.filter(
                    request => request.approvalState == "pending"
                  )
                }
                showApproveReject={true}
                asAdmin={true}
                onReviewed={refetch}
                initialSelectedId={linkedId}
              />}
        </TabsContent>
        <TabsContent value="approved">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage
                borrowRequests={
                  borrowRequests.filter(
                    request => request.approvalState == "approved"
                  )
                }
                showApproveReject={true}
                asAdmin={true}
                onReviewed={refetch}
                initialSelectedId={linkedId}
              />}
        </TabsContent>
        <TabsContent value="rejected">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage
                borrowRequests={
                  borrowRequests.filter(
                    request => request.approvalState == "rejected"
                  )
                }
                showApproveReject={true}
                asAdmin={true}
                onReviewed={refetch}
                initialSelectedId={linkedId}
              />}
        </TabsContent>
      </Tabs>
    </RegularPage>
  )
}

export default BorrowRequests
