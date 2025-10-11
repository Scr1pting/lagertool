import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";

import DataTable from "@/components/DataTable";

type InventoryRecord = {
	id: number;
	itemId: number;
	locationId: number;
	available: number;
	borrowed: number;
};

type ItemRecord = {
	id: number;
	name: string;
	category?: string | null;
};

type LocationRecord = {
	id: number;
	campus?: string | null;
	building?: string | null;
	room?: string | null;
	shelf?: string | null;
	shelfunit?: string | null;
};

type LoanRecord = {
	id: number;
	itemId: number;
	amount: number;
	returned?: boolean | null;
};

type InventoryRow = {
	itemId: number;
	name: string;
	category?: string | null;
	available: number;
	borrowed: number;
	total: number;
	locations: Array<{
		locationId: number;
		label: string;
		available: number;
	}>;
};

const API_BASE_URL =
	import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api";

const toNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return null;
};

const parseInventoryRecord = (entry: unknown): InventoryRecord | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;
	const id = toNumber(raw.id);
	const itemId = toNumber(raw.item_id ?? raw.itemId);
	const locationId = toNumber(raw.location_id ?? raw.locationId);
	if (typeof id !== "number" || typeof itemId !== "number" || typeof locationId !== "number") {
		return null;
	}

	const amount = toNumber(raw.amount) ?? 0;
	const available =
		toNumber(raw.available ?? raw.available_amount ?? raw.remaining) ?? amount;
	const borrowed =
		toNumber(
			raw.borrowed ?? raw.borrowed_amount ?? raw.on_loan ?? raw.loaned ?? raw.reserved,
		) ?? 0;

	return {
		id,
		itemId,
		locationId,
		available: Math.max(available, 0),
		borrowed: Math.max(borrowed, 0),
	};
};

const parseItemRecord = (entry: unknown): ItemRecord | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;
	const id = toNumber(raw.id);
	const name = typeof raw.name === "string" ? raw.name : null;
	if (typeof id !== "number" || !name) {
		return null;
	}

	return {
		id,
		name,
		category: typeof raw.category === "string" ? raw.category : null,
	};
};

const parseLocationRecord = (entry: unknown): LocationRecord | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;
	const id = toNumber(raw.id);
	if (typeof id !== "number") {
		return null;
	}

	return {
		id,
		campus: typeof raw.campus === "string" ? raw.campus : null,
		building: typeof raw.building === "string" ? raw.building : null,
		room: typeof raw.room === "string" ? raw.room : null,
		shelf: typeof raw.shelf === "string" ? raw.shelf : null,
		shelfunit: typeof raw.shelfunit === "string" ? raw.shelfunit : null,
	};
};

const parseLoanRecord = (entry: unknown): LoanRecord | null => {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const raw = entry as Record<string, unknown>;
	const id = toNumber(raw.id);
	const itemId = toNumber(raw.item_id ?? raw.itemId);
	const amount = toNumber(raw.amount) ?? 0;
	if (typeof id !== "number" || typeof itemId !== "number") {
		return null;
	}

	const returned = raw.returned === true || raw.returned === 1;

	return {
		id,
		itemId,
		amount,
		returned,
	};
};

const formatLocation = (location?: LocationRecord | null) => {
	if (!location) {
		return "Unknown location";
	}

	const shelfSegment = [location.shelf, location.shelfunit]
		.filter((value) => typeof value === "string" && value.trim().length > 0)
		.join(" ");

	const parts = [
		location.campus,
		location.building,
		location.room,
		shelfSegment || null,
	].filter((value): value is string => Boolean(value && value.trim().length > 0));

	return parts.join(" · ") || `Location #${location.id}`;
};

const inventoryColumns: ColumnDef<InventoryRow>[] = [
	{
		accessorKey: "name",
		header: "Item",
		cell: ({ row, getValue }) => {
			const label = getValue<string>() ?? `Item #${row.original.itemId}`;
			return (
				<Link
					to={`/items/${row.original.itemId}`}
					className="text-primary underline-offset-2 hover:underline"
				>
					{label}
				</Link>
			);
		},
	},
	{
		accessorKey: "category",
		header: "Category",
		cell: ({ getValue }) => getValue<string | null | undefined>() ?? "—",
	},
	{
		id: "available",
		header: "Available",
		cell: ({ row }) => row.original.available.toLocaleString(),
	},
	{
		id: "borrowed",
		header: "Borrowed",
		cell: ({ row }) => row.original.borrowed.toLocaleString(),
	},
	{
		id: "total",
		header: "Total",
		cell: ({ row }) => row.original.total.toLocaleString(),
	},
	{
		id: "locations",
		header: "Locations",
		cell: ({ row }) => (
			<div className="space-y-1 text-sm text-muted-foreground">
				{row.original.locations.map((entry) => (
					<div key={entry.locationId} className="flex flex-col">
						<span className="text-foreground">{entry.label}</span>
						<span>{`${entry.available.toLocaleString()} available`}</span>
					</div>
				))}
			</div>
		),
	},
];

export default function InventoryStatusPage() {
	const [rows, setRows] = useState<InventoryRow[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);

		const loadData = async () => {
			try {
				const [inventoryRes, itemsRes, locationsRes, loansRes] = await Promise.all([
					fetch(`${API_BASE_URL}/inventory`, { signal: controller.signal }),
					fetch(`${API_BASE_URL}/items`, { signal: controller.signal }),
					fetch(`${API_BASE_URL}/locations`, { signal: controller.signal }),
					fetch(`${API_BASE_URL}/loans`, { signal: controller.signal }),
				]);

				if (!inventoryRes.ok) {
					throw new Error(`Failed to load inventory (HTTP ${inventoryRes.status})`);
				}
				if (!itemsRes.ok) {
					throw new Error(`Failed to load items (HTTP ${itemsRes.status})`);
				}
				if (!locationsRes.ok) {
					throw new Error(`Failed to load locations (HTTP ${locationsRes.status})`);
				}
				if (!loansRes.ok) {
					throw new Error(`Failed to load loans (HTTP ${loansRes.status})`);
				}

				const [inventoryJson, itemsJson, locationsJson, loansJson] = await Promise.all([
					inventoryRes.json(),
					itemsRes.json(),
					locationsRes.json(),
					loansRes.json(),
				]);

				const inventoryData = Array.isArray(inventoryJson)
					? inventoryJson.map(parseInventoryRecord).filter((record): record is InventoryRecord => record !== null)
					: [];

				const itemMap = new Map(
					(Array.isArray(itemsJson) ? itemsJson : [])
						.map(parseItemRecord)
						.filter((item): item is ItemRecord => item !== null)
						.map((item) => [item.id, item]),
				);

				const locationMap = new Map(
					(Array.isArray(locationsJson) ? locationsJson : [])
						.map(parseLocationRecord)
						.filter((location): location is LocationRecord => location !== null)
						.map((location) => [location.id, location]),
				);

				const activeLoanTotals = new Map<number, number>();
				(Array.isArray(loansJson) ? loansJson : [])
					.map(parseLoanRecord)
					.filter((loan): loan is LoanRecord => loan !== null)
					.forEach((loan) => {
						if (loan.returned) {
							return;
						}
						const current = activeLoanTotals.get(loan.itemId) ?? 0;
						activeLoanTotals.set(loan.itemId, current + Math.max(loan.amount, 0));
					});

				const byItem = new Map<number, InventoryRecord[]>();
				for (const record of inventoryData) {
					const bucket = byItem.get(record.itemId);
					if (bucket) {
						bucket.push(record);
					} else {
						byItem.set(record.itemId, [record]);
					}
				}

				const nextRows: InventoryRow[] = [];
				for (const [itemId, records] of byItem.entries()) {
					const item = itemMap.get(itemId);
					const available = records.reduce((sum, record) => sum + Math.max(record.available, 0), 0);
					const borrowedFromRecords = records.reduce(
						(sum, record) => sum + Math.max(record.borrowed, 0),
						0,
					);
					const borrowed = borrowedFromRecords > 0
						? borrowedFromRecords
						: activeLoanTotals.get(itemId) ?? 0;
					const total = available + borrowed;

					const locations = records.map((record) => ({
						locationId: record.locationId,
						label: formatLocation(locationMap.get(record.locationId)),
						available: Math.max(record.available, 0),
					}));

					nextRows.push({
						itemId,
						name: item?.name ?? `Item #${itemId}`,
						category: item?.category ?? null,
						available,
						borrowed,
						total,
						locations,
					});
				}

				nextRows.sort((a, b) => {
					if (b.borrowed === a.borrowed) {
						return a.name.localeCompare(b.name);
					}
					return b.borrowed - a.borrowed;
				});

				setRows(nextRows);
			} catch (caught) {
				if (caught instanceof DOMException && caught.name === "AbortError") {
					return;
				}
				setError(caught instanceof Error ? caught.message : "Failed to load inventory overview.");
			} finally {
				setLoading(false);
			}
		};

		void loadData();

		return () => controller.abort();
	}, []);

	const summary = useMemo(() => {
		const totalAvailable = rows.reduce((sum, row) => sum + row.available, 0);
		const totalBorrowed = rows.reduce((sum, row) => sum + row.borrowed, 0);
		return {
			totalAvailable,
			totalBorrowed,
			distinctItems: rows.length,
		};
	}, [rows]);

	return (
		<div className="container mx-auto max-w-6xl space-y-8 py-10">
			<header className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight">Inventory Overview</h1>
				<p className="text-sm text-muted-foreground">
					Track how many items are currently available versus on loan. Data is aggregated from the inventory endpoint and active loans.
				</p>
			</header>

			<section className="grid gap-4 md:grid-cols-3">
				<article className="rounded-xl border bg-card p-5 shadow-sm">
					<p className="text-xs uppercase tracking-widest text-muted-foreground">Distinct items</p>
					<p className="mt-2 text-3xl font-semibold">{summary.distinctItems.toLocaleString()}</p>
				</article>
				<article className="rounded-xl border bg-card p-5 shadow-sm">
					<p className="text-xs uppercase tracking-widest text-muted-foreground">Available units</p>
					<p className="mt-2 text-3xl font-semibold text-green-500">
						{summary.totalAvailable.toLocaleString()}
					</p>
				</article>
				<article className="rounded-xl border bg-card p-5 shadow-sm">
					<p className="text-xs uppercase tracking-widest text-muted-foreground">Units borrowed</p>
					<p className="mt-2 text-3xl font-semibold text-amber-500">
						{summary.totalBorrowed.toLocaleString()}
					</p>
				</article>
			</section>

			{error ? (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
					{error}
				</div>
			) : null}

			{loading ? (
				<div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
					Loading inventory…
				</div>
			) : (
				<DataTable columns={inventoryColumns} data={rows} />
			)}
		</div>
	);
}
