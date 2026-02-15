import RequestTypePage from "@/components/BorrowRequests/RequestTypePage"
import RegularPage from "@/components/RegularPage"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import useFetchBorrowRequests from "@/hooks/fetch/useFetchBorrowRequests"
import { Check, Clock, X } from "lucide-react"

function BorrowRequests() {
  const { data: borrowRequests } = useFetchBorrowRequests()
  
  return (
    <RegularPage title="Borrow Requests">
      <Tabs defaultValue="overview" className="w-[400px]">
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
          <RequestTypePage borrowRequests={borrowRequests ?? []}  />
        </TabsContent>
        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Track performance and user engagement metrics. Monitor trends and
                identify growth opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Page views are up 25% compared to last month.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate and download your detailed reports. Export data in
                multiple formats for analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              You have 5 reports ready and available to export.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </RegularPage>
  )
}

export default BorrowRequests
