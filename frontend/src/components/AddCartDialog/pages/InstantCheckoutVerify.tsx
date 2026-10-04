import { useDate } from "@/store/useDate"
import { format } from "date-fns/format"
import { useState, type FormEvent } from "react"
import { DialogFooter, DialogHeader, DialogTitle } from "../../shadcn/dialog"
import { Separator } from "../../shadcn/separator"
import { Button } from "../../shadcn/button"
import { toast } from "sonner"
import type { InventoryItem } from "@/types/inventory"
import axios from "axios"
import { describeUnavailable, errorMessage, unavailableItemsOf } from "@/lib/availabilityConflict"
import { useDateParams } from "@/hooks/useDateParams"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''


interface InstantCheckoutVerifyProps {
  amountSelected: number;
  item: InventoryItem;
  title: string;
  description: string;
  onBack: () => void;
  resetValues: () => void;
}

function InstantCheckoutVerify({
  amountSelected, item, title, description, onBack, resetValues
}: InstantCheckoutVerifyProps) {
  const selectedRange = useDate(state => state.selectedRange)
  const { startDate, endDate } = useDateParams()
  const [submitting, setSubmitting] = useState(false)

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

  // Borrows just this item; the cart is left as it is.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      // Backend expects timestamps; dates mean UTC midnight like the ?start/?end params.
      await axios.post(`${API_BASE_URL}/me/checkout`, {
        id: item.id,
        numSelected: amountSelected,
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T00:00:00Z`,
        title,
        description,
      })
    } catch (err) {
      const unavailable = unavailableItemsOf(err)
      toast.error(unavailable ? "Not available for these dates" : "Could not submit borrow request", {
        description: unavailable ? unavailable.map(describeUnavailable).join(", ") : errorMessage(err),
      })
      setSubmitting(false)
      return
    }
    setSubmitting(false)

    toast("Submitted Borrow Request", {
      description: `${item.name} - ${amountSelected}`,
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
            <span className="font-medium">{amountSelected}</span>
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
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Borrow Request"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export default InstantCheckoutVerify
