import type { Shelf, ShelfElement } from "@/types/shelf"
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog"
import StaticShelf from "./Shelves/viewer/StaticShelf"
import type { ReactNode } from "react"
import { DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./shadcn/dialog"
import { Button } from "./shadcn/button"


interface ShelfElementSelectProps {
  open: boolean
  onOpenChange: (newOpen: boolean) => void
  shelf: Shelf | undefined
  selectedElement: ShelfElement | undefined
  onElementChange: (element: ShelfElement) => void
  children: ReactNode
}

function ShelfElementSelect(
  { open, onOpenChange, shelf, selectedElement, onElementChange, children }: ShelfElementSelectProps
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
              onElementSelect={onElementChange}
              highlightedElement={selectedElement?.id}
            />
          </div>
        }

        <DialogFooter>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShelfElementSelect
