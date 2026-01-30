import DataTable from "@/components/DataTable/DataTable"
import { searchColumns } from "@/components/DataTable/InventoryTable/searchColumns"
import RegularPage from "@/components/RegularPage"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import useFetchInventory from "@/hooks/fetch/useFetchInventory"


function Search() {
  const { data: inventory } = useFetchInventory()

  return (
    <RegularPage
      title="Search Results"
      description={<AvailabilityDescription />}
    >
      <DataTable
        data={inventory ?? []}
        columns={searchColumns}
        rowLink={row => `/item?id=${row.id}`}
      />
    </RegularPage>
  )
}

export default Search
  