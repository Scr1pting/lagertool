import type { ColumnDef } from "@tanstack/react-table";
import { type ShelfElementItem } from "../types/shelf";
import DataTable from "@/components/DataTable";
import useElementItems from "../hooks/useElementItems";

export const columns: ColumnDef<ShelfElementItem>[] = [
  {
    accessorKey: "name",
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

function ShelfDetail({ elementId, building, room, shelf }: { elementId: string, building: string, room: string, shelf: string }) {
  const { status, data: shelves, error } = useElementItems(elementId);

  if (status === "error") return <p role="alert">{error?.message ?? "Failed to load shelves"}</p>;
  if (status === "success" && (!shelves || shelves.length === 0)) return <p>No shelves yet.</p>;
  else if (!shelves || shelves.length === 0) return <></>;

  return(
    <section>
      <h1 className=""></h1>
      <p><i>{building + " - " + room + " - " + shelf}</i></p>

      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={shelves} />
      </div>
    </section>
  )
}

export default ShelfDetail
