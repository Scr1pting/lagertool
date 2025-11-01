import { useMemo } from "react"
import getInventory from "@/api/getInventory";
import DataTable from "@/components/DataTable/DataTable";
import createInventoryColumns from "@/components/DataTable/InventoryTable/InventoryColumns";
import RegularPage from "@/components/RegularPage";
import useApi from "@/hooks/useApi";
import type { InventoryItem } from "@/types/inventory";

function Search() {
  const { status, data: inventory, error } = useApi<InventoryItem[]>(getInventory);

  const columns = useMemo(() => createInventoryColumns(), [])

  return (
    <RegularPage title="Search Results">
      <DataTable data={inventory ?? []} columns={columns} />
    </RegularPage>
  )
}

export default Search;
