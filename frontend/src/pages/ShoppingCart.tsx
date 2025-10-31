import cartColumns from "@/components/InventoryTable/CartColumns";
import DataTable from "@/components/InventoryTable/DataTable";
import RegularPage from "@/components/RegularPage";
import { useCart } from "@/store/useCart";

function ShoppingCart() {
  const cart = useCart((state) => state.cartItems);

  return (
    <RegularPage title="Shopping Cart">
      <DataTable data={cart ?? []} columns={cartColumns} />
    </RegularPage>
  );
}

export default ShoppingCart;
