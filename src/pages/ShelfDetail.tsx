import type { ColumnDef } from "@tanstack/react-table";
import { type ShelfElementItem } from "../features/shelves/types/shelf";
import DataTable from "@/components/DataTable";
import useElementItems from "../features/shelves/hooks/useElementItems";

export const columns: ColumnDef<ShelfElementItem>[] = [
  {
    accessorKey: "item_name",
    header: "Name",
  },
  {
    accessorKey: "amount",
    header: "Amount",
  },
  {
    accessorKey: "available",
    header: "Available"
  }
]

function ShelfDetail({ elementId }: { elementId: string }) {
  const { status, data: elementItems, error } = useElementItems(elementId);

  if (status === "error") return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (status === "success" && (!elementItems || elementItems.length === 0)) return <p>No shelves yet.</p>;
  else if (!elementItems || elementItems.length === 0) return <></>;

  return(
    <section>
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={elementItems} />
      </div>
    </section>
  )
}

export default ShelfDetail
