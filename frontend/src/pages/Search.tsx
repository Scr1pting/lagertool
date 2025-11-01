import { useMemo } from "react"
import getInventory from "@/api/getInventory";
import DataTable from "@/components/DataTable/DataTable";
import createInventoryColumns from "@/components/DataTable/InventoryTable/InventoryColumns";
import RegularPage from "@/components/RegularPage";
import SelectedRangeDesc from "@/components/SelectedRangeDesc";
import useApi from "@/hooks/useApi";
import { useDate } from "@/store/useDate";
import type { InventoryItem } from "@/types/inventory";

function Search() {
  const { status, data: inventory, error } = useApi<InventoryItem[]>(getInventory);
  const selectedRange = useDate((state) => state.selectedRange)

  return (
    <RegularPage
      title="Search Results"
      description={<SelectedRangeDesc range={selectedRange} />}
    >
      <DataTable data={inventory ?? []} columns={inventoryColumns} />
    </RegularPage>
  )
}

export default Search;
