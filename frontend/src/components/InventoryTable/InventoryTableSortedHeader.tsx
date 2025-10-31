import type { Column } from "@tanstack/react-table"
import { Button } from "../ui/button"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

function InventoryTableSortedHeader<TData, TValue>({
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
      size="sm"
      className="data-[state=open]:bg-accent -ml-3 h-8"
      onClick={
        () => column.toggleSorting(column.getIsSorted() === "asc")
      }
      >
      <span>{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowDown />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUp />
      ) : (
        <ArrowUpDown />
      )}
    </Button>
  )
}

export default InventoryTableSortedHeader;
