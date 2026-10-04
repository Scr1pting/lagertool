import { useEffect } from "react"
import cartColumns from "@/components/DataTable/CartColumns"
import DataTable from "@/components/DataTable/DataTable"
import RegularPage from "@/components/RegularPage"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { Button } from "@/components/shadcn/button"
import { ButtonGroup } from "@/components/shadcn/button-group"
import { useCart } from "@/store/useCart"
import useFetchCart from "@/hooks/fetch/useFetchCart"
import del from "@/api/del"
import BorrowDialog, { type BorrowDetails, type BorrowResult } from "@/components/BorrowDialog"
import { describeUnavailable, errorMessage, unavailableItemsOf } from "@/lib/availabilityConflict"
import axios from "axios"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''


function ShoppingCart() {
  const { data: fetchedCart, status, refetch } = useFetchCart()
  const cart = useCart(state => state.cartItems)
  const updateCart = useCart(state => state.update)
  const removeAll = useCart(state => state.removeAll)

  useEffect(() => {
    if (fetchedCart) {
      updateCart(fetchedCart)
    }
  }, [fetchedCart, updateCart])

  const clearCart = async () => {
    try {
      await del(`${API_BASE_URL}/me/cart/items`)
      removeAll()
    } catch (err) {
      toast.error("Could not clear cart", {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  // Turns the whole cart into borrow requests (one per organisation) with the
  // dialog's title and period. The backend empties the cart afterwards.
  const borrow = async ({ title, description, startDate, endDate }: BorrowDetails): Promise<BorrowResult> => {
    try {
      // Backend expects timestamps; dates mean UTC midnight like the ?start/?end params.
      await axios.post(`${API_BASE_URL}/me/cart/checkout`, {
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T00:00:00Z`,
        title,
        description,
      })
    } catch (err) {
      const unavailable = unavailableItemsOf(err)
      if (unavailable) {
        // Someone else got there first, or the cart was loaded for other dates.
        refetch()
        return {
          ok: false,
          problem: <>
            <p>Not everything is available for these dates:</p>
            <ul className="list-disc pl-5 mt-1">
              {unavailable.map(item => <li key={item.id}>{describeUnavailable(item)}</li>)}
            </ul>
          </>,
        }
      }
      toast.error("Could not submit borrow request", { description: errorMessage(err) })
      return { ok: false }
    }
    removeAll()
    toast("Submitted borrow request", { description: title })
    return { ok: true }
  }

  const overbooked = cart.filter(item => item.amountSelected > item.available)

  return (
    <RegularPage
      title="Cart"
      description={<AvailabilityDescription />}
    >
      <DataTable
        data={cart ?? []}
        columns={cartColumns}
        loading={status === "loading"}
      />

      <div className="w-full gap-4 flex justify-center mt-6 flex-wrap sm:flex-nowrap flex-row">
        <ButtonGroup>
          <Button variant="outline" onClick={clearCart}>Clear</Button>
        </ButtonGroup>
        <ButtonGroup>
          <BorrowDialog onSubmit={borrow}>
            <Button disabled={cart.length === 0 || overbooked.length > 0}>Borrow</Button>
          </BorrowDialog>
        </ButtonGroup>
      </div>

      {overbooked.length > 0 &&
        <div className="text-sm text-destructive text-center mt-5 leading-snug">
          <p>Not enough available for these dates.</p>
          <p>Lower the amounts or pick other dates using the date picker next to search.</p>
        </div>
      }
    </RegularPage>
  )
}

export default ShoppingCart
