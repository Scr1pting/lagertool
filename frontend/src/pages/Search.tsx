import getInventory from "@/api/getInventory";
import InventoryTable from "@/components/InventoryTable/InventoryTable";
import RegularPage from "@/components/RegularPage";
import useApi from "@/hooks/useApi";
import type { InventoryItem } from "@/types/inventory";

function Search() {
  const { status, data: inventory, error } = useApi<InventoryItem[]>(getInventory);

  console.log(inventory);

  return (
    <RegularPage title="Search Results">
      <InventoryTable inventory={inventory ?? []} />
    </RegularPage>
  )
}

export default Search;
