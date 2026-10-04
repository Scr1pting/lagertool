import { useCart } from "@/store/useCart"
import post from "@/api/post"
import put from "@/api/put"
import del from "@/api/del"
import type { CartItem } from "@/types/cart"
import type { InventoryItem } from "@/types/inventory"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../shadcn/dialog"
import { Field, FieldError } from "../../shadcn/field"
import { Label } from "../../shadcn/label"
import { Input } from "../../shadcn/input"
import { Button } from "../../shadcn/button"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''


interface MainProps {
  amountSelected: number
  setAmountSelected: React.Dispatch<React.SetStateAction<number>>
  item: InventoryItem
  resetValues: () => void
  onProceed: () => void
}

function Main({ amountSelected, setAmountSelected, item, resetValues, onProceed }: MainProps) {
  const add = useCart(state => state.add)
  const setAmount = useCart(state => state.setAmount)

  const exceedsAvailable = !Number.isNaN(amountSelected) && amountSelected > item.available
  const isInvalidAmount = Number.isNaN(amountSelected) || amountSelected < 1 || exceedsAvailable

  // Puts the item back to what was in the cart before adding: removes it if it
  // wasn't there, otherwise restores the earlier amount.
  const undoAdd = async (cartItem: CartItem, previousAmount: number) => {
    const url = `${API_BASE_URL}/me/cart/items/${cartItem.id}`
    try {
      if (previousAmount > 0) {
        await put(url, { amount: previousAmount })
      } else {
        await del(url)
      }
    } catch (err) {
      toast.error("Could not undo", {
        description: err instanceof Error ? err.message : undefined,
      })
      return
    }
    setAmount(cartItem.id, previousAmount)
    toast(previousAmount > 0 ? "Restored cart" : "Removed from cart", {
      description: previousAmount > 0 ? `${cartItem.name} - ${previousAmount}` : cartItem.name,
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isInvalidAmount) {
      const cartItem: CartItem = { ...item, amountSelected: amountSelected }
      // The backend cart is the source of truth; the local store mirrors it for the sidebar.
      let amountInCart: number
      try {
        const saved = await post<{ amount: number }, unknown>(`${API_BASE_URL}/me/cart/items`, { id: item.id, numSelected: amountSelected })
        amountInCart = saved.amount
      } catch (err) {
        toast.error("Could not add to cart", {
          description: err instanceof Error ? err.message : undefined,
        })
        return
      }
      add(cartItem)

      toast("Added to cart", {
        description: `${cartItem.name} - ${cartItem.amountSelected}`,
        action: {
          label: "Undo",
          onClick: () => undoAdd(cartItem, amountInCart - cartItem.amountSelected),
        },
      })

      resetValues()
    }
  }

  return (
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
          name="amountSelected"
          type="number"
          min={1}
          max={item.available}
          aria-invalid={exceedsAvailable}
          value={amountSelected}
          onChange={e => { setAmountSelected(Number.parseInt(e.target.value, 10)) }}
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
            disabled={isInvalidAmount}
            type="button"
            onClick={onProceed}
            variant="outline"
          >
            Instant Checkout
          </Button>

          <Button
            disabled={isInvalidAmount}
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
