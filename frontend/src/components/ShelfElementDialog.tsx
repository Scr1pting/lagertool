import useFetchInventory from "@/hooks/fetch/useFetchInventory";
import DataTable from "./DataTable/DataTable";
import { DialogContent, DialogDescription, DialogHeader } from "./shadcn/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import AvailabilityDescription from "./AvailabilityDescription";
import type { SelectedShelfElement } from "@/types/shelf";
import { inventoryShelfColumns } from "./DataTable/inventoryShelfColumns";


interface ShelfElementDialogProps {
  shelfElement: SelectedShelfElement
}

function ShelfElementDialog({
  shelfElement
}: ShelfElementDialogProps) {
  const { data: inventory } = useFetchInventory();

  return <DialogContent className="!w-[650px] !max-w-[650px]">
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
      />
    </section>
  </DialogContent>
}

export default ShelfElementDialog;
