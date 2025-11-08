import type { ReactNode } from "react"
import { TabsContent } from "../shadcn/tabs"
import { Card, CardHeader, CardTitle } from "../shadcn/card"
import DataTable from "../DataTable/DataTable"
import type { ColumnDef } from "@tanstack/react-table"


interface ManageInventoryWrapperProps<T> {
  type: string
  tableItems: T[] | undefined
  columnDef: ColumnDef<T>[]
  children: ReactNode
}


/**
 * A generic element for a Tab consisting of T
 * 
 * @param type 
 * @param tableItems - the data to be rendered in the table
 * @param columnDef
 * @param children
 */
function ManageInventoryWrapper<T>({ type, tableItems, columnDef, children }: ManageInventoryWrapperProps<T>) {
  return(
    <TabsContent value={type}>
      <div className="space-y-10">
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">Add {type}</CardTitle>
          </CardHeader>
          {children}
        </Card>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Recently Added
          </h2>
          <DataTable data={tableItems == undefined ? [] : tableItems} columns={columnDef} />
        </section>
      </div>
    </TabsContent>
  )
}

export default ManageInventoryWrapper
