import RequestTypePage from "@/components/BorrowRequests/RequestTypePage"
import RegularPage from "@/components/RegularPage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import useFetchBorrowRequests from "@/hooks/fetch/useFetchBorrowRequests"
import { Check, Clock, X } from "lucide-react"

function BorrowRequests() {
  const { data: borrowRequests } = useFetchBorrowRequests()
  
  return (
    <RegularPage title="Borrow Requests">
      <Tabs defaultValue="pending-approval">
      <TabsList>
          <TabsTrigger value="pending-approval">
            <Clock />
            Pending Approval
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
        <TabsContent value="pending-approval">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage borrowRequests={borrowRequests}  />
          }
        </TabsContent>
        <TabsContent value="approved">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage borrowRequests={borrowRequests}  />
          }
        </TabsContent>
        <TabsContent value="rejected">
          {borrowRequests != null
           && borrowRequests.length != 0
           && <RequestTypePage borrowRequests={borrowRequests}  />
          }
        </TabsContent>
      </Tabs>
    </RegularPage>
  )
}

export default BorrowRequests
