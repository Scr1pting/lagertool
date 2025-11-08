import { Button } from "../shadcn/button"
import { CardContent, CardFooter } from "../shadcn/card"
import { Label } from "../shadcn/label"
import ManageInventoryWrapper from "./ManageInventoryWrapper"
import type { ColumnDef } from "@tanstack/react-table"
import type { ManageInventoryElement } from "./types/ManageInventoryElement"


interface ManageInventoryElementsProps<T> {
  type: "item" | "shelf" | "room" | "building"
  elements: ManageInventoryElement[]
  tableItems: T[] | undefined
  columnDef: ColumnDef<T>[]
}


/**
 * 
 */
function ManageInventoryElements<T>({ type, elements, tableItems, columnDef }: ManageInventoryElementsProps<T>) {
  return (
    <ManageInventoryWrapper
      type={type}
      tableItems={tableItems}
      columnDef={columnDef}
    >
      <CardContent className={`grid gap-4 sm:grid-cols-2`}>
        {elements.map((element) =>
          <div key={element.id} className={`grid gap-2 ${element.size === 'full' ? 'sm:col-span-2' : ''}`}>
            <Label htmlFor={element.id}>{element.label}</Label>
            {element.input}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="button">Save</Button>
      </CardFooter>
    </ManageInventoryWrapper>
  )
}

export default ManageInventoryElements
