import cartColumns from "@/components/DataTable/CartColumns";
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

      <div className="flex w-full flex-wrap items-center justify-center gap-13 pt-4 md:flex-row">
        <ButtonGroup>
          <Button variant="destructive">Clear</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button>Borrow</Button>
        </ButtonGroup>
      </div>
    </RegularPage>
  );
}

export default ShoppingCart;
