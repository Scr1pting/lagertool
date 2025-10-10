"use client"

import { useState, useEffect } from 'react';
import DataTable from '@/components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';


type InventoryItem = {
  name: string;
  shelf_name: string;
  room_name: string;
  building_name: string;
  amount: number;
};

export const columns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "shelf_name",
    header: "Shelf",
  },
  {
    accessorKey: "room_name",
    header: "Room",
  },
  {
    accessorKey: "building_name",
    header: "Building",
  },
  {
    accessorKey: "amount",
    header: "Amount",
  }  
]


function Search() {
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch("https://05.hackathon.ethz.ch/api/inventory")
        .then((response) => response.json())
        .then((json) => setData(json))
        .catch((error) => console.error("Error fetching data:", error));
    }, []);

    return(
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} />
        </div>
    )
}

export default Search
