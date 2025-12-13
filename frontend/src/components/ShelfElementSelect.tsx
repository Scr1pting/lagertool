import type { Shelf, ShelfElement } from "@/types/shelf";
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
import StaticShelf from "./Shelves/viewer/StaticShelf";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "./shadcn/dialog";


interface ShelfElementSelectProps {
  open: boolean
  onOpenChange: (newOpen: boolean) => void
  shelf: Shelf | undefined
  selectedElement: ShelfElement | undefined
  setSelectedElement: Dispatch<SetStateAction<ShelfElement | undefined>>
  children: ReactNode
}

function ShelfElementSelect(
  { open, onOpenChange, shelf, selectedElement, setSelectedElement, children }: ShelfElementSelectProps
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
        <DialogHeader>
          <DialogTitle>Select Shelf Element</DialogTitle>
        </DialogHeader>

        { shelf &&
          <div className="m-3 mt-6">
            <StaticShelf
              shelf={shelf}
              onElementSelect={newElement => setSelectedElement(newElement)}
              highlightedElement={selectedElement?.id}
            />
          </div>
        }
      </DialogContent>
    </Dialog>
  )
}

export default ShelfElementSelect
