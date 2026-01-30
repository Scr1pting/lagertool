import { useMemo, useState } from "react";
import RegularPage from "@/components/RegularPage";
import useFetchBorrowed from "@/hooks/fetch/useFetchBorrowed";
import AccountEventsAccordion from "@/components/AccountEventsAccordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";

function Account() {
  const { data, status, error } = useFetchBorrowed();
  const [sortMode, setSortMode] = useState<"recent" | "name">("recent");

  const sortedEvents = useMemo(() => {
    if (!data) return [];
    const copy = [...data];
    if (sortMode === "recent") {
      return copy.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
    }
    return copy.sort((a, b) => (a.eventName || a.id).localeCompare(b.eventName || b.id));
  }, [data, sortMode]);

  return (
    <RegularPage title="Account" description="Your borrowed items">
      <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as "recent" | "name")} className="mb-4">
        <TabsList className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <TabsTrigger value="recent" className="text-sm">
            Sort: Most Recent
          </TabsTrigger>
          <TabsTrigger value="name" className="text-sm">
            Sort: Name
          </TabsTrigger>
        </TabsList>
        <TabsContent value="recent" />
        <TabsContent value="name" />
      </Tabs>
      {status === "loading" && <p>Loading borrowed items…</p>}
      {status === "error" && <p className="text-red-600">Failed to load: {error?.message}</p>}
      {status === "success" && sortedEvents.length ? (
        <AccountEventsAccordion events={sortedEvents} />
      ) : null}
    </RegularPage>
  );
}

export default Account;
