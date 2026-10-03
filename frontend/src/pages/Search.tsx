import { useSearchParams } from "react-router"
import DataTable from "@/components/DataTable/DataTable"
import { searchColumns } from "@/components/DataTable/InventoryTable/searchColumns"
import RegularPage from "@/components/RegularPage"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import useFetchSearch from "@/hooks/fetch/useFetchSearch"

function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("query") ?? ""
  const { data: results, status } = useFetchSearch(query)

  return (
    <RegularPage
      title={query ? `Results for "${query}"` : "Search"}
      description={<AvailabilityDescription />}
    >
      <DataTable
        data={results ?? []}
        columns={searchColumns}
        rowLink={row => `/item?id=${row.original.id}`}
        loading={status === "loading"}
      />
    </RegularPage>
  )
}

export default Search
  