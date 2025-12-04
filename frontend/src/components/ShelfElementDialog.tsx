import useFetchInventory from "@/hooks/fetch/useFetchInventory";
import DataTable from "./DataTable/DataTable";
import { DialogContent, DialogDescription, DialogHeader } from "./shadcn/dialog";
import { Dialog, DialogTitle } from "@radix-ui/react-dialog";
import AvailabilityDescription from "./AvailabilityDescription";
import type { SelectedShelfElement } from "@/types/shelf";
import { inventoryShelfColumns } from "./DataTable/inventoryShelfColumns";


interface ShelfElementDialogProps {
  open: boolean
  onOpenChange: () => void
  shelfElement: SelectedShelfElement | null
}

function ShelfElementDialog({
  open,
  onOpenChange,
  shelfElement
}: ShelfElementDialogProps) {
  const { data: inventory } = useFetchInventory();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      { shelfElement && 
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
              rowLink={(row) => `/item?id=${row.id}`}
              className="h-[60vh] max-h-[850px] overflow-y-auto"
              sticky
            />
          </section>
        </DialogContent>
      }
    </Dialog>
  )
}

export default ShelfElementDialog;
