"use client"

import { useState, useEffect } from 'react';
import DataTable from '@/components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';


type BorrowedItem = {
    item: string;
    endDate: Date;
    startDate: Date;
    person: string;
    number: string;
    email: string;
};

export const columns: ColumnDef<BorrowedItem>[] = [
    {
        accessorKey: "item",
        header: "Item",
    },
    {
        accessorKey: "endDate",
        header: "Return Date",
        cell: ({ getValue }) => {
            const date = getValue<Date>();
            return date.toLocaleDateString();
        },
    },
    {
        accessorKey: "startDate",
        header: "Borrow Date",
        cell: ({ getValue }) => {
            const date = getValue<Date>();
            return date.toLocaleDateString();
        }
    },
    {
        accessorKey: "person",
        header: "Borrowed By",
    },
    {
        accessorKey: "number",
        header: "Phone Number",
    },
    {
        accessorKey: "email",
        header: "Email Address",
    }
]


function borrow_func() {
    const [data, setData] = useState<BorrowedItem[]>([]);

    useEffect(() => {
    fetch("https://05.hackathon.ethz.ch/api/borrows")
        .then((response) => response.json())
        .then((json) => {
            const loans = Array.isArray(json) ? json : [];
            const formattedLoans: BorrowedItem[] = loans.map((loan: any) => ({
                item: `Item ${loan.perm_id}`,
                startDate: new Date(loan.begin),
                endDate: new Date(loan.until),
                person: `${loan.firstname} ${loan.lastname}`,
                number: loan.telephone,
                email: loan.email,
            }));
            setData(formattedLoans);
        })
        .catch((error) => console.error("Error fetching data:", error));
}, []);

    const highlightOverdueRow = (row: { original: BorrowedItem }) => {
        const endDate = row.original?.endDate;
        if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
            return "";
        }
        return endDate.getTime() < Date.now() ? "bg-red-200 hover:bg-red-200" : "";
    }

    return (
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} getRowClassName={highlightOverdueRow} />
        </div>


    )
}

export default borrow_func

