/*"use client"

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

export default Search */

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../components/DataTable"; // adjust path as needed
import NavBar from "@/components/NavBar";

const columns = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "shelf_name", header: "Shelf" },
  { accessorKey: "room_name", header: "Room" },
  { accessorKey: "building_name", header: "Building" },
  { accessorKey: "amount", header: "Amount" }
];

export default function Search() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("search_term") || "";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const endpoint = searchTerm
          ? `https://05.hackathon.ethz.ch/search?search_term=${encodeURIComponent(searchTerm)}`
          : `https://05.hackathon.ethz.ch/api/inventory`;

        const res = await fetch(endpoint, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const items = Array.isArray(json) ? json : (json.items || json.results || []);
        setData(items);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [searchTerm]);

  return (
    <div className="container mx-auto py-10">
        <NavBar />

        <h1 className="text-2xl mb-4">Search results for "{searchTerm}"</h1>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {!loading && !error && <DataTable columns={columns} data={data} />}
    </div>
  );
}

