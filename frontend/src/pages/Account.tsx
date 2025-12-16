import RegularPage from "@/components/RegularPage";
import useFetchBorrowed from "@/hooks/fetch/useFetchBorrowed";
import AccountEventsAccordion from "@/components/AccountEventsAccordion";

function Account() {
  const { data, status, error } = useFetchBorrowed();

  return (
    <RegularPage title="Account" description="Your borrowed items">
      {status === "loading" && <p>Loading borrowed items…</p>}
      {status === "error" && <p className="text-red-600">Failed to load: {error?.message}</p>}
      {status === "success" && data ? (
        <AccountEventsAccordion events={data} />
      ) : null}
    </RegularPage>
  );
}

export default Account;
