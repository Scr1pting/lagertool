import cartColumns from "@/components/DataTable/cartColumns";
import DataTable from "@/components/DataTable/DataTable";
import RegularPage from "@/components/RegularPage";
import SelectedRangeDesc from "@/components/SelectedRangeDesc";
import { Button } from "@/components/shadcn/button";
import { ButtonGroup } from "@/components/shadcn/button-group";
import { useCart } from "@/store/useCart";
import { useDate } from "@/store/useDate";

function ShoppingCart() {
  const cart = useCart((state) => state.cartItems);
  const selectedRange = useDate((state) => state.selectedRange)

  return (
    <RegularPage
      title="Cart"
      description={<SelectedRangeDesc range={selectedRange} />}
    >
      <DataTable data={cart ?? []} columns={cartColumns} />

      <div className="w-full gap-13 flex justify-center mt-6 flex-wrap sm:flex-nowrap flex-row">
        <ButtonGroup>
          <Button variant="outline">Clear</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button>Borrow</Button>
        </ButtonGroup>
      </div>
    </RegularPage>
  );
}

export default ShoppingCart;
