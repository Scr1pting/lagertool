import { ExitShelfBuilderButton, NextShelfBuilderButton } from "@/components/Shelves/builder/AddShelfButtons"
import ShelfBuilder from "@/components/Shelves/builder/ShelfBuilder"
import type { ShelfColumn } from "@/types/shelf"
import { useState } from "react"

function AddShelf() {
  const [columns, setColumns] = useState<ShelfColumn[]>([])

  return (
    <ShelfBuilder
      columns={columns}
      setColumns={setColumns}
      panelHeaderAction={<ExitShelfBuilderButton />}
      panelFooter={<NextShelfBuilderButton columns={columns} />}
    />
  )
}

export default AddShelf
