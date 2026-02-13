import useFetchInventory from "@/hooks/fetch/useFetchInventory"
import DataTable from "./DataTable/DataTable"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./shadcn/dialog"
import AvailabilityDescription from "./AvailabilityDescription"
import type { Shelf, ShelfElement } from "@/types/shelf"
import { inventoryShelfColumns } from "./DataTable/inventoryShelfColumns"


interface ShelfElementDialogProps {
  open: boolean
  onOpenChange: () => void
  shelf: Shelf | undefined
  shelfElement: ShelfElement | null
}

function ShelfElementDialog({
  open,
  onOpenChange,
  shelfElement
}: ShelfElementDialogProps) {
  // TODO: pass shelf
  const { data: inventory } = useFetchInventory()

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      {shelfElement &&
        <DialogContent className="!w-[650px] !max-w-[650px]">
          <DialogHeader>
            <DialogTitle>{shelfElement.id}</DialogTitle>
            <DialogDescription>
              <AvailabilityDescription />
            </DialogDescription>
          </DialogHeader>

          <section className="">
            <DataTable
              data={inventory ?? []}
              columns={inventoryShelfColumns}
              rowLink={row => `/item?id=${row.id}`}
              className="h-[60vh] max-h-[850px] overflow-y-auto"
              sticky
            />
          </section>
        </DialogContent>
      }
    </Dialog>
  )
}

export default ShelfElementDialog
