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

import React, { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import DataTable from "../components/DataTable"

type ItemResult = {
  id: number
  name: string
  category?: string | null
}

type PersonResult = {
  id: number
  firstname?: string | null
  lastname?: string | null
  slack_id?: string | null
}

type PersonRow = {
  id: number
  name: string
  slack: string
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const itemColumns: ColumnDef<ItemResult>[] = [
  {
    accessorKey: "name",
    header: "Item",
    cell: ({ row, getValue }) => {
      const label = getValue<string>() ?? `Item #${row.original.id}`
      return (
        <Link
          to={`/items/${row.original.id}`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => getValue<string | null | undefined>() ?? "—",
  },
]

const personColumns: ColumnDef<PersonRow>[] = [
  {
    accessorKey: "name",
    header: "Person",
    cell: ({ row, getValue }) => {
      const label = getValue<string>() ?? `Person #${row.original.id}`
      return (
        <Link
          to={`/persons/${row.original.id}`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      )
    },
  },
  {
    accessorKey: "slack",
    header: "Slack",
    cell: ({ getValue }) => getValue<string>() || "—",
  },
]

export default function Search() {
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get("query") ?? ""
  const trimmedQuery = queryParam.trim()

  const [items, setItems] = useState<ItemResult[]>([])
  const [persons, setPersons] = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trimmedQuery) {
      setItems([])
      setPersons([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const fetchResults = async () => {
      setLoading(true)
      setError(null)

      try {
        const encoded = encodeURIComponent(trimmedQuery)
        const [itemRes, personRes] = await Promise.all([
          fetch(`${API_BASE_URL}/items/search?name=${encoded}`, {
            signal: controller.signal,
          }),
          fetch(
            `${API_BASE_URL}/persons/search?firstname=${encoded}&lastname=${encoded}`,
            { signal: controller.signal }
          ),
        ])

        if (!itemRes.ok) {
          throw new Error(`Item search failed (HTTP ${itemRes.status})`)
        }
        if (!personRes.ok) {
          throw new Error(`Person search failed (HTTP ${personRes.status})`)
        }

        const itemJson: unknown = await itemRes.json()
        const personJson: unknown = await personRes.json()

        const nextItems: ItemResult[] = Array.isArray(itemJson)
          ? (itemJson.filter((entry): entry is ItemResult => {
              return (
                entry !== null &&
                typeof entry === "object" &&
                "id" in entry &&
                typeof (entry as ItemResult).id === "number" &&
                "name" in entry
              )
            }) as ItemResult[])
          : []

        const nextPersons: PersonRow[] = Array.isArray(personJson)
          ? (personJson
              .filter((entry): entry is PersonResult => {
                return entry !== null && typeof entry === "object" && "id" in entry
              })
              .map<PersonRow>((person) => {
                const firstname = person.firstname?.trim() ?? ""
                const lastname = person.lastname?.trim() ?? ""
                const name = [firstname, lastname].filter(Boolean).join(" ") || "Unknown"
                const slack = person.slack_id?.trim() ?? ""
                return {
                  id: person.id,
                  name,
                  slack,
                }
              })
              .filter((person) => Boolean(person.name)) as PersonRow[])
          : []

        setItems(nextItems)
        setPersons(nextPersons)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        const message =
          caught instanceof Error ? caught.message : "Search failed. Please try again."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
    return () => controller.abort()
  }, [trimmedQuery])

  const hasQuery = trimmedQuery.length > 0
  const resultsSummary = useMemo(() => {
    if (!hasQuery || loading) return ""
    const segments = []
    if (items.length) segments.push(`${items.length} item${items.length === 1 ? "" : "s"}`)
    if (persons.length)
      segments.push(`${persons.length} person${persons.length === 1 ? "" : "s"}`)
    if (!segments.length) return "No matches found."
    return `Found ${segments.join(" and ")}.`
  }, [hasQuery, items.length, loading, persons.length])

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        {hasQuery ? (
          <p className="text-muted-foreground">
            Showing results for <span className="font-medium">“{trimmedQuery}”</span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Type in the search bar above to find items or people across the inventory.
          </p>
        )}
      </header>

      {loading && (
        <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-muted-foreground">
          Searching…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && hasQuery && (
        <div className="space-y-10">
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Items</h2>
              <p className="text-sm text-muted-foreground">
                Results from <code>/items/search</code>
              </p>
            </div>
            <DataTable columns={itemColumns} data={items} />
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">People</h2>
              <p className="text-sm text-muted-foreground">
                Results from <code>/persons/search</code>
              </p>
            </div>
            <DataTable columns={personColumns} data={persons} />
          </section>
        </div>
      )}

      {!loading && !error && hasQuery && (
        <p className="text-sm text-muted-foreground">{resultsSummary}</p>
      )}
    </div>
  )
}
