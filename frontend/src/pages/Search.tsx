import DataTable from "@/components/DataTable/DataTable";
import { inventoryColumnsFull } from "@/components/DataTable/InventoryTable/InventoryColumns";
import RegularPage from "@/components/RegularPage";
import SelectedRangeDesc from "@/components/SelectedRangeDesc";
import useInventory from "@/hooks/useInventory";
import { useDate } from "@/store/useDate";


function Search() {
  const { status, data: inventory, error } = useInventory();
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
  