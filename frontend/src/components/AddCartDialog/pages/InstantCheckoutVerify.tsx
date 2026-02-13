import { useDate } from "@/store/useDate"
import { format } from "date-fns/format"
import type { FormEvent } from "react"
import { DialogFooter, DialogHeader, DialogTitle } from "../../temp/dialog"
import { Separator } from "../../temp/separator"
import { Button } from "../../temp/button"
import { toast } from "sonner"
import type { InventoryItem } from "@/types/inventory"


interface InstantCheckoutVerifyProps {
  numSelected: number;
  item: InventoryItem;
  title: string;
  description: string;
  onBack: () => void;
  resetValues: () => void;
}

function InstantCheckoutVerify({
  numSelected, item, title, description, onBack, resetValues
}: InstantCheckoutVerifyProps) {
  const selectedRange = useDate(state => state.selectedRange)

  const formattedDateRange = () => {
    const today = new Date()

    if (!selectedRange?.from) {
      const todayLabel = format(today, "MMM d, yyyy")
      return `${todayLabel} - ${todayLabel}`
    }

    const startLabel = format(selectedRange.from, "MMM d, yyyy")
    const endDate = selectedRange.to ?? selectedRange.from
    const endLabel = format(endDate, "MMM d, yyyy")

    return `${startLabel} - ${endLabel}`
  }
  
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    toast("Submitted Borrow Request", {
      description: `${item.name} - ${numSelected}`,
      action: {
        label: "Undo",
        onClick: () => console.log("Undo"),
      },
    })

    resetValues()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Direct Checkout</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-3 mt-2">
        <div className="my-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Title</span>
            <span className="font-medium">{title}</span>
          </div>

          <Separator />

          {description !== "" &&
            <>
              <div className="flex justify-between">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium">{description}</p>
              </div>
              <Separator />
            </>
          }

          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{item.name}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{numSelected}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{formattedDateRange()}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>

          <Button
            type="submit"
          >
            Submit Borrow Request
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export default InstantCheckoutVerify
