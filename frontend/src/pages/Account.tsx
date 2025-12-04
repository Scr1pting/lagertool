import RegularPage from "@/components/RegularPage";
import DataTable from "@/components/DataTable/DataTable";
import borrowedColumns from "@/components/DataTable/BorrowedColumns";
import useFetchBorrowed from "@/hooks/useFetchBorrowed";

function Account() {
  const { data, status, error } = useFetchBorrowed();

  return (
    <RegularPage title="Account" description="Your borrowed items">
      {status === "loading" && <p>Loading borrowed items…</p>}
      {status === "error" && <p className="text-red-600">Failed to load: {error?.message}</p>}
      {status === "success" && <DataTable data={data ?? []} columns={borrowedColumns} />}
    </RegularPage>
  );
}

export default Account;

