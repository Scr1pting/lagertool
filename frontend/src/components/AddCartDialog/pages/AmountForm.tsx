import { useCart } from "@/store/useCart"
import type { CartItem } from "@/types/cart"
import type { InventoryItem } from "@/types/inventory"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../temp/dialog"
import { Field, FieldError } from "../../temp/field"
import { Label } from "../../temp/label"
import { Input } from "../../temp/input"
import { Button } from "../../temp/button"


interface MainProps {
  numSelected: number
  setNumSelected: React.Dispatch<React.SetStateAction<number>>
  item: InventoryItem
  resetValues: () => void
  onProceed: () => void
}

function Main({ numSelected, setNumSelected, item, resetValues, onProceed }: MainProps) {
  const add = useCart(state => state.add)

  const exceedsAvailable = !Number.isNaN(numSelected) && numSelected > item.available
  const isInvalidQuantity = Number.isNaN(numSelected) || numSelected < 1 || exceedsAvailable

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!isInvalidQuantity) {
      const cartItem: CartItem = { ...item, numSelected: numSelected }
      add(cartItem)

      toast("Added to cart", {
        description: `${cartItem.name} - ${cartItem.numSelected}`,
        action: {
          label: "Undo",
          onClick: () => console.log("Undo"),
        },
      })

      resetValues()
    }
  }

  return(
    <form onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{item.name}</DialogTitle>
        <DialogDescription>
          {item.available} Available.
        </DialogDescription>
      </DialogHeader>
      <Field>
        <Label htmlFor="num-selected">Amount</Label>
        <Input
          id="num-selected"
          name="numSelected"
          type="number"
          min={1}
          max={item.available}
          aria-invalid={exceedsAvailable}
          value={numSelected}
          onChange={e => { setNumSelected(Number.parseInt(e.target.value, 10)) }}
        />
        {exceedsAvailable && (
          <FieldError className="text-destructive" role="alert">
            Only {item.available} available.
          </FieldError>
        )}
      </Field>
      <DialogFooter>
        <Field orientation="horizontal" className="justify-end">
          <Button
            disabled={isInvalidQuantity}
            type="button"
            onClick={onProceed}
            variant="outline"
          >
            Instant Checkout
          </Button>

          <Button
            disabled={isInvalidQuantity}
            type="submit"
          >
            Add to Cart
          </Button>
        </Field>
      </DialogFooter>
    </form>
  )
}

export default Main
