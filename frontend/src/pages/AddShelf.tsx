import AddShelfActionBar from "@/components/AddShelfActionBar";
import ShelfBuilder from "@/features/shelves/components/ShelfBuilder";
import type { ShelfColumn } from "@/features/shelves/types/shelf";
import { useState } from "react";

function AddShelf() {
  const [columns, setColumns] = useState<ShelfColumn[]>([])

  return (
    <>
      <AddShelfActionBar columns={columns} />
      <ShelfBuilder columns={columns} setColumns={setColumns} />
    </>
  )
}

export default AddShelf;
