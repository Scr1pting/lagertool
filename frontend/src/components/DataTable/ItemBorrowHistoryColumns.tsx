import type { ColumnDef } from "@tanstack/react-table"
import type { BorrowState } from "@/types/borrow"
import type { ItemBorrowHistory } from "@/types/inventory"
import SortableHeader from "./SortableHeader"
import { formatDate } from "@/lib/formatDate"
import { Badge } from "@/components/shadcn/badge"

const stateVariant: Record<BorrowState, { label: string; variant: "yellow" | "blue" | "slate" | "red" | "emerald" }> = {
    pending: { label: "Pending", variant: "yellow" },
    approved: { label: "Approved", variant: "blue" },
    on_loan: { label: "On Loan", variant: "slate" },
    overdue: { label: "Overdue", variant: "red" },
    returned: { label: "Returned", variant: "emerald" },
}

const itemBorrowHistoryColumns: ColumnDef<ItemBorrowHistory>[] = [
    {
        accessorKey: "id",
        header: ({ column }) => <SortableHeader column={column} title="User" />,
        cell: ({ row }) => row.original.id,
    },

    {
        accessorKey: "eventName",
        header: ({ column }) => <SortableHeader column={column} title="Event" />,
        cell: ({ row }) => row.original.eventName,
    },
    {
        accessorKey: "startDate",
        header: ({ column }) => <SortableHeader column={column} title="Borrowed" />,
        sortingFn: (a, b) =>
            new Date(a.original.startDate).getTime() - new Date(b.original.startDate).getTime(),
        cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
        accessorKey: "returnDate",
        header: ({ column }) => <SortableHeader column={column} title="Due/Return" />,
        sortingFn: (a, b) =>
            new Date(a.original.returnDate ?? 0).getTime() - new Date(b.original.returnDate ?? 0).getTime(),
        cell: ({ row }) => row.original.returnDate ? formatDate(row.original.returnDate) : "—",
    },
    {
        accessorKey: "state",
        header: ({ column }) => <SortableHeader column={column} title="State" />,
        cell: ({ row }) => {
            const { label, variant } = stateVariant[row.original.state] ?? { label: row.original.state, variant: "outline" as const }
            return <Badge variant={variant}>{label}</Badge>
        },
    },
    {
        accessorKey: "quantity",
        header: ({ column }) => <SortableHeader column={column} title="Quantity" />,
        cell: ({ row }) => row.original.quantity,
    },


]

export default itemBorrowHistoryColumns
