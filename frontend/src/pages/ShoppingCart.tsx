import cartColumns from "@/components/DataTable/CartColumns";
import DataTable from "@/components/DataTable/DataTable";
import RegularPage from "@/components/RegularPage";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useCart } from "@/store/useCart";

function ShoppingCart() {
  const cart = useCart((state) => state.cartItems);

  return (
    <RegularPage title="Shopping Cart">
      <DataTable data={cart ?? []} columns={cartColumns} />

      <ButtonGroup>
        <ButtonGroup>
          <Button variant="destructive">Clear</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button>Borrow</Button>
        </ButtonGroup>
      </ButtonGroup>
    </RegularPage>
  );
}

export default ShoppingCart;
