import DataTable from "@/components/DataTable/DataTable";
import { searchColumns } from "@/components/DataTable/InventoryTable/SearchColumns";
import RegularPage from "@/components/RegularPage";
import AvailabilityDescription from "@/components/AvailabilityDescription";
import useInventory from "@/hooks/fetch/useFetchInventory";
import { useDate } from "@/store/useDate";


function Search() {
  const { data: inventory } = useInventory();
  const selectedRange = useDate((state) => state.selectedRange)

  return (
    <RegularPage
      title="Search Results"
      description={<AvailabilityDescription range={selectedRange} />}
    >
      <DataTable
        data={inventory ?? []}
        columns={searchColumns}
        rowLink={(row) => `/item?id=${row.id}`}
      />
    </RegularPage>
  )
}

export default Search;
  