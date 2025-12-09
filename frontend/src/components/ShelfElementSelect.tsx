import type { Shelf, ShelfElement } from "@/types/shelf";
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
import StaticShelf from "./Shelves/viewer/StaticShelf";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { DialogContent } from "./shadcn/dialog";


interface ShelfElementSelectProps {
  open: boolean
  onOpenChange: () => void
  shelf: Shelf | undefined
  selectedElementId: string | undefined
  setSelectedElementId: Dispatch<SetStateAction<string | undefined>>
  children: ReactNode
}

function ShelfElementSelect(
  { open, onOpenChange, shelf, selectedShelf, setSelectedShelf, children }: ShelfElementSelectProps
) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogTrigger
        disabled={shelf == undefined}
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent>
        { shelf &&
          <StaticShelf shelf={shelf} />
        }
      </DialogContent>
    </Dialog>
  )
}

export default ShelfElementSelect
