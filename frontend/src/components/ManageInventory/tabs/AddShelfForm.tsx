import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { ArrowUpRightIcon } from "lucide-react"
import { Link } from "react-router-dom"
import type { Shelf } from "@/types/shelf"
import { TabsContent } from "@/components/shadcn/tabs"
import DataTable from "@/components/DataTable/DataTable"
import shelfColumns from "@/components/DataTable/ManageInventory/ShelfColumns"


interface AddShelfProps {
  shelves: Shelf[]
}

function AddShelf({ shelves }: AddShelfProps) {
  return (
    <TabsContent value="buildings">
      <div className="space-y-10">
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">Add Shelf</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Shelves can be added in the dedicated Shelf Builder.
              </p>
              <Button asChild>
                <Link to="/add-shelf" className="inline-flex items-center gap-2">
                  Go to Shelf Builder
                  <ArrowUpRightIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Recently Added
          </h2>
          <DataTable
            data={shelves}
            columns={shelfColumns}
          />
        </section>
      </div>
    </TabsContent>
  )
}

export default AddShelf
