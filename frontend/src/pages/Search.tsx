import getInventory from "@/api/getInventory";
import DataTable from "@/components/DataTable/DataTable";
import { inventoryColumnsFull } from "@/components/DataTable/InventoryTable/InventoryColumns";
import RegularPage from "@/components/RegularPage";
import SelectedRangeDesc from "@/components/SelectedRangeDesc";
import useApi from "@/hooks/useApi";
import { useDate } from "@/store/useDate";
import type { InventoryItem } from "@/types/inventory";


function Search() {
  const { data: inventory } = useApi<InventoryItem[]>(getInventory);
  const selectedRange = useDate((state) => state.selectedRange)

  return (
    <RegularPage
      title="Search Results"
      description={<SelectedRangeDesc range={selectedRange} />}
    >
      <DataTable data={inventory ?? []} columns={inventoryColumnsFull} />

    
    </RegularPage>
  )
}

export default Search;
  