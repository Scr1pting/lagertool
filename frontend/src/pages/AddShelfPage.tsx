import AddShelfActionBar from "@/components/Shelves/builder/AddShelfActionBar";
import ShelfBuilder from "@/components/Shelves/builder/ShelfBuilder";
import type { ShelfColumn } from "@/types/shelf";
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
