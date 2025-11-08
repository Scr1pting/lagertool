import { Button } from "@/components/shadcn/button"
import ManageInventoryWrapper from "../ManageInventoryWrapper"
import { CardContent } from "@/components/shadcn/card"
import { ArrowUpRightIcon } from "lucide-react"
import { Link } from "react-router-dom"
import shelfColumns from "@/components/DataTable/ShelfColumns"
import type { Shelf } from "@/types/shelf"


interface AddShelfProps {
  shelves: Shelf[]
}

function AddShelf({ shelves }: AddShelfProps) {
  return (
    <ManageInventoryWrapper 
      type={"shelf"}
      tableItems={shelves}
      columnDef={shelfColumns}
    >
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
    </ManageInventoryWrapper>
  )
}

export default AddShelf
