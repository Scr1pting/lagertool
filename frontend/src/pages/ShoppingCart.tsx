import { useEffect, useState } from "react"
import cartColumns from "@/components/DataTable/CartColumns"
import DataTable from "@/components/DataTable/DataTable"
import RegularPage from "@/components/RegularPage"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { Button } from "@/components/shadcn/button"
import { ButtonGroup } from "@/components/shadcn/button-group"
import { useCart } from "@/store/useCart"
import useFetchCart from "@/hooks/fetch/useFetchCart"
import del from "@/api/del"
import post from "@/api/post"
import { useDateParams } from "@/hooks/useDateParams"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''


function ShoppingCart() {
  const { data: fetchedCart, status } = useFetchCart()
  const cart = useCart(state => state.cartItems)
  const updateCart = useCart(state => state.update)
  const removeAll = useCart(state => state.removeAll)
  const { startDate, endDate } = useDateParams()
  const [submitting, setSubmitting] = useState(false)

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

  // Turns the whole cart into borrow requests (one per organisation) for the
  // selected date range. The backend empties the cart afterwards.
  const borrow = async () => {
    setSubmitting(true)
    try {
      // Backend expects timestamps; dates mean UTC midnight like the ?start/?end params.
      await post(`${API_BASE_URL}/me/cart/checkout`, {
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T00:00:00Z`,
      })
      removeAll()
      toast("Submitted borrow request", {
        description: `${startDate} – ${endDate}`,
      })
    } catch (err) {
      toast.error("Could not submit borrow request", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

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
          <Button onClick={borrow} disabled={submitting || cart.length === 0}>
            {submitting ? "Submitting…" : "Borrow"}
          </Button>
        </ButtonGroup>
      </div>
    </RegularPage>
  )
}

export default ShoppingCart
