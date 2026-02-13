import cartColumns from "@/components/DataTable/cartColumns"
import DataTable from "@/components/DataTable/DataTable"
import RegularPage from "@/components/RegularPage"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { Button } from "@/components/temp/button"
import { ButtonGroup } from "@/components/temp/button-group"
import { useCart } from "@/store/useCart"


function ShoppingCart() {
  const cart = useCart(state => state.cartItems)

  return (
    <RegularPage
      title="Cart"
      description={<AvailabilityDescription />}
    >
      <DataTable data={cart ?? []} columns={cartColumns} />

      <div className="w-full gap-4 flex justify-center mt-6 flex-wrap sm:flex-nowrap flex-row">
        <ButtonGroup>
          <Button variant="outline">Clear</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button>Borrow</Button>
        </ButtonGroup>
      </div>
    </RegularPage>
  )
}

export default ShoppingCart
