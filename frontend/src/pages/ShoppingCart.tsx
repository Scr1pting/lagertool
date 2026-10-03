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
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''


function ShoppingCart() {
  const { data: fetchedCart, status } = useFetchCart()
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
          <Button>Borrow</Button>
        </ButtonGroup>
      </div>
    </RegularPage>
  )
}

export default ShoppingCart
