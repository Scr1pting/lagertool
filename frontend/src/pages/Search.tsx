import getInventory from "@/api/getInventory";
import DataTable from "@/components/InventoryTable/DataTable";
import inventoryColumns from "@/components/InventoryTable/InventoryColumns";
import RegularPage from "@/components/RegularPage";
import useApi from "@/hooks/useApi";
import type { InventoryItem } from "@/types/inventory";

function Search() {
  const { status, data: inventory, error } = useApi<InventoryItem[]>(getInventory);

  console.log(inventory);

  return (
    <RegularPage title="Search Results">
      <DataTable data={inventory ?? []} columns={inventoryColumns} />
    </RegularPage>
  )
}

export default Search;
