import type { Column } from "@tanstack/react-table"
import { Button } from "../shadcn/button"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

function DataTableSortedHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }
  return (
    <Button
      variant="ghost"
      className="data-[state=open]:bg-accent -ml-3 h-8"
      onClick={
        () => column.toggleSorting(undefined)
      }
      >
      <span>{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowDown />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUp />
      ) : (
        <ArrowUpDown className="text-neutral-500" />
      )}
    </Button>
  )
}

export default DataTableSortedHeader;
