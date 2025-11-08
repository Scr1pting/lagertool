import * as React from "react"
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import type { ColumnDef, ColumnFiltersState, Row, SortingState } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table"
import { useNavigate } from "react-router-dom"


interface DataTableProps<TData>
  extends React.HTMLAttributes<HTMLDivElement> {
  data: TData[]
  columns: ColumnDef<TData>[]
  rowLink?: (row: Row<TData>) => string
}

function DataTable<TData>({ data, columns, rowLink } : DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const navigate = useNavigate()

  const table = useReactTable<TData>({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  const rowElement = (row: Row<TData>) => {
    const destination = rowLink?.(row)
    const isLink = Boolean(destination)

    return (
      <TableRow
        key={row.id}
        className={isLink ? "cursor-pointer hover:bg-muted/30" : "hover:bg-transparent"}
        tabIndex={isLink ? 0 : undefined}
        onClick={
          destination ? () => navigate(destination) : undefined
        }
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className="px-4">
            {flexRender(
              cell.column.columnDef.cell,
              cell.getContext()
            )}
          </TableCell>
        ))}
      </TableRow>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className="bg-neutral-900 px-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              rowElement(row)
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                Nothing to show here.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default DataTable;
