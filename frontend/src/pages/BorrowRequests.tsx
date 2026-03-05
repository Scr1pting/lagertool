import RequestTypePage from "@/components/BorrowRequests/RequestTypePage"
import RegularPage from "@/components/RegularPage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import useFetchBorrowRequestsAdmin from "@/hooks/fetch/useFetchBorrowRequestsAdmin"
import { Check, Clock, X } from "lucide-react"

function BorrowRequests() {
  const { data: borrowRequests } = useFetchBorrowRequestsAdmin()
  
  return (
    <RegularPage title="Borrow Requests" noBottomPadding>
      <Tabs defaultValue="pending">
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
           && <RequestTypePage borrowRequests={
            borrowRequests.filter(
              request => request.approvalState == "pending"
            )
           }/>}
        </TabsContent>
        <TabsContent value="approved">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage borrowRequests={
            borrowRequests.filter(
              request => request.approvalState == "approved"
            )
           }/>}
        </TabsContent>
        <TabsContent value="rejected">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage borrowRequests={
            borrowRequests.filter(
              request => request.approvalState == "rejected"
            )
           }/>}
        </TabsContent>
      </Tabs>
    </RegularPage>
  )
}

export default BorrowRequests
