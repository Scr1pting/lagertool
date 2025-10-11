import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import fetchShelves from "@/features/shelves/api/getShelves";
import fetchShelfUnitInventory from "@/api/getShelfUnitInventory";
import type { ShelfUnitInventoryItem } from "@/api/types";
import type { Shelf } from "@/features/shelves/types/shelf";

const API_BASE_URL =
	import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api";

const normalizeKey = (value?: string | null) => {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed.toLowerCase() : "__none__";
};

const buildOptionLabel = (raw?: string | null) => raw?.trim() || "Unassigned";

const asCount = (value?: number | null) =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

type ApiShelf = Shelf & {
	numElements?: number | null;
};

type RoomGroup = {
	key: string;
	buildingKey: string;
	buildingLabel: string;
	roomKey: string;
	roomLabel: string;
	shelves: ApiShelf[];
};

type ShelfInventoryByUnit = {
	unitId: string;
	items: ShelfUnitInventoryItem[];
};

type ShelfInventoryState = {
	loading: boolean;
	error: string | null;
	units: ShelfInventoryByUnit[];
};

type ItemActionState = {
	saving: boolean;
	error: string | null;
	success: string | null;
};

export default function ShelvesPage() {
	const [shelves, setShelves] = useState<ApiShelf[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const [search, setSearch] = useState("");
	const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
	const [selectedRoom, setSelectedRoom] = useState<string>("all");

	const [expandedShelfId, setExpandedShelfId] = useState<string | null>(null);
	const [inventoryState, setInventoryState] = useState<
		Record<string, ShelfInventoryState>
	>({});
	const [amountEdits, setAmountEdits] = useState<Record<string, Record<number, string>>>(
		{},
	);
	const [itemActions, setItemActions] = useState<
		Record<string, Record<number, ItemActionState>>
	>({});

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);

		fetchShelves({ signal: controller.signal })
			.then((data) => {
				setShelves(data);
			})
			.catch((caught) => {
				if (caught instanceof DOMException && caught.name === "AbortError") {
					return;
				}
				setError(caught instanceof Error ? caught.message : "Failed to load shelves.");
			})
			.finally(() => setLoading(false));

		return () => controller.abort();
	}, []);

	const loadShelfInventory = useCallback(async (shelf: ApiShelf) => {
		const unitIds = shelf.columns
			.flatMap((column) => column.elements.map((element) => element.id))
			.filter((id): id is string => Boolean(id && id.trim().length > 0));

		if (unitIds.length === 0) {
			setInventoryState((prev) => ({
				...prev,
				[shelf.id]: { loading: false, error: null, units: [] },
			}));
			return;
		}

		setInventoryState((prev) => ({
			...prev,
			[shelf.id]: { loading: true, error: null, units: [] },
		}));

		try {
			const units = await Promise.all(
				unitIds.map(async (unitId) => {
					const items = await fetchShelfUnitInventory(unitId);
					return { unitId, items };
				}),
			);

			setInventoryState((prev) => ({
				...prev,
				[shelf.id]: { loading: false, error: null, units },
			}));
		} catch (caught) {
			const message =
				caught instanceof Error
					? caught.message
					: "Failed to load inventory for this shelf.";
			setInventoryState((prev) => ({
				...prev,
				[shelf.id]: { loading: false, error: message, units: [] },
			}));
		}
	}, []);

	useEffect(() => {
		setAmountEdits((prev) => {
			let next = prev;
			let mutated = false;

			for (const [shelfId, state] of Object.entries(inventoryState)) {
				if (!state || state.loading || state.error) {
					continue;
				}

				const previousShelf = prev[shelfId] ?? {};
				const shelfMap: Record<number, string> = { ...previousShelf };
				let shelfMutated = false;
				const presentIds = new Set<number>();

				for (const unit of state.units) {
					for (const item of unit.items) {
						if (typeof item.inventory_id !== "number") {
							continue;
						}
						presentIds.add(item.inventory_id);
						const desiredValue = String(
							item.amount ??
								item.available ??
								item.borrowed ??
								0,
						);
						if (shelfMap[item.inventory_id] !== desiredValue) {
							shelfMap[item.inventory_id] = desiredValue;
							shelfMutated = true;
						}
					}
				}

				for (const key of Object.keys(shelfMap)) {
					const numericKey = Number(key);
					if (!presentIds.has(numericKey)) {
						delete shelfMap[numericKey];
						shelfMutated = true;
					}
				}

				if (shelfMutated) {
					if (!mutated) {
						next = { ...prev };
						mutated = true;
					}
					next[shelfId] = shelfMap;
				}
			}

			return mutated ? next : prev;
		});
	}, [inventoryState]);

	const updateItemActionState = useCallback(
		(shelfId: string, inventoryId: number, update: Partial<ItemActionState>) => {
			setItemActions((prev) => {
				const shelfActions = prev[shelfId] ?? {};
				const current =
					shelfActions[inventoryId] ?? {
						saving: false,
						error: null,
						success: null,
					};

				return {
					...prev,
					[shelfId]: {
						...shelfActions,
						[inventoryId]: { ...current, ...update },
					},
				};
			});
		},
		[],
	);

	const handleAmountInputChange = (shelfId: string, inventoryId: number, value: string) => {
		setAmountEdits((prev) => {
			const shelfMap = { ...(prev[shelfId] ?? {}) };
			shelfMap[inventoryId] = value;
			return {
				...prev,
				[shelfId]: shelfMap,
			};
		});
		updateItemActionState(shelfId, inventoryId, { error: null, success: null });
	};

	const handleUpdateAmount = async (shelf: ApiShelf, inventoryId: number) => {
		const shelfInputs = amountEdits[shelf.id] ?? {};
		const rawValue = shelfInputs[inventoryId];
		const parsed = Number(rawValue);

		if (!Number.isFinite(parsed) || parsed < 0) {
			updateItemActionState(shelf.id, inventoryId, {
				error: "Amount must be 0 or a positive number.",
				success: null,
			});
			return;
		}

		updateItemActionState(shelf.id, inventoryId, {
			saving: true,
			error: null,
			success: null,
		});

		try {
			const response = await fetch(`${API_BASE_URL}/inventory/${inventoryId}/amount`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ amount: parsed }),
			});

			if (!response.ok) {
				throw new Error(`Failed to update amount (HTTP ${response.status})`);
			}

			await loadShelfInventory(shelf);

			setAmountEdits((prev) => {
				const shelfMap = { ...(prev[shelf.id] ?? {}) };
				shelfMap[inventoryId] = String(parsed);
				return {
					...prev,
					[shelf.id]: shelfMap,
				};
			});

			updateItemActionState(shelf.id, inventoryId, {
				saving: false,
				error: null,
				success: "Amount updated.",
			});

			window.setTimeout(() => {
				updateItemActionState(shelf.id, inventoryId, { success: null });
			}, 3000);
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : "Failed to update amount.";
			updateItemActionState(shelf.id, inventoryId, {
				saving: false,
				error: message,
				success: null,
			});
		}
	};

	const handleDeleteInventory = async (shelf: ApiShelf, inventoryId: number) => {
		const confirmed = window.confirm(
			"Are you sure you want to remove this inventory entry from the shelf?",
		);
		if (!confirmed) {
			return;
		}

		updateItemActionState(shelf.id, inventoryId, {
			saving: true,
			error: null,
			success: null,
		});

	try {
		const response = await fetch(`${API_BASE_URL}/inventory/${inventoryId}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error(`Failed to delete inventory record (HTTP ${response.status})`);
		}

		await loadShelfInventory(shelf);

		setAmountEdits((prev) => {
			const shelfMap = { ...(prev[shelf.id] ?? {}) };
			delete shelfMap[inventoryId];
			const next = { ...prev };
			if (Object.keys(shelfMap).length === 0) {
				delete next[shelf.id];
			} else {
				next[shelf.id] = shelfMap;
			}
			return next;
		});

		setItemActions((prev) => {
			const shelfActions = { ...(prev[shelf.id] ?? {}) };
			delete shelfActions[inventoryId];
			const next = { ...prev };
			if (Object.keys(shelfActions).length === 0) {
				delete next[shelf.id];
			} else {
				next[shelf.id] = shelfActions;
			}
			return next;
		});
	} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : "Failed to delete inventory record.";
			updateItemActionState(shelf.id, inventoryId, {
				saving: false,
				error: message,
				success: null,
			});
		}
	};

	const buildingOptions = useMemo(() => {
		const map = new Map<string, string>();
		for (const shelf of shelves) {
			const key = normalizeKey(shelf.building);
			if (!map.has(key)) {
				map.set(key, buildOptionLabel(shelf.building));
			}
		}

		return Array.from(map.entries())
			.sort((a, b) => a[1].localeCompare(b[1]))
			.map(([value, label]) => ({ value, label }));
	}, [shelves]);

	const roomOptions = useMemo(() => {
		const relevantShelves =
			selectedBuilding === "all"
				? shelves
				: shelves.filter((shelf) => normalizeKey(shelf.building) === selectedBuilding);

		const map = new Map<string, string>();
		for (const shelf of relevantShelves) {
			const key = normalizeKey(shelf.room);
			if (!map.has(key)) {
				map.set(key, buildOptionLabel(shelf.room));
			}
		}

		return Array.from(map.entries())
			.sort((a, b) => a[1].localeCompare(b[1]))
			.map(([value, label]) => ({ value, label }));
	}, [shelves, selectedBuilding]);

	const normalizedSearch = search.trim().toLowerCase();

	const filteredShelves = useMemo(() => {
		return shelves.filter((shelf) => {
			if (selectedBuilding !== "all" && normalizeKey(shelf.building) !== selectedBuilding) {
				return false;
			}

			if (selectedRoom !== "all" && normalizeKey(shelf.room) !== selectedRoom) {
				return false;
			}

			if (!normalizedSearch) {
				return true;
			}

			const haystack = [shelf.id, shelf.name, shelf.building, shelf.room]
				.map((part) => part?.toLowerCase() ?? "")
				.join(" ");

			return haystack.includes(normalizedSearch);
		});
	}, [shelves, selectedBuilding, selectedRoom, normalizedSearch]);

	const groupedShelves = useMemo<RoomGroup[]>(() => {
		const groups = new Map<string, RoomGroup>();

		for (const shelf of filteredShelves) {
			const buildingKey = normalizeKey(shelf.building);
			const roomKey = normalizeKey(shelf.room);
			const key = `${buildingKey}::${roomKey}`;

			if (!groups.has(key)) {
				groups.set(key, {
					key,
					buildingKey,
					roomKey,
					buildingLabel: buildOptionLabel(shelf.building),
					roomLabel: buildOptionLabel(shelf.room),
					shelves: [shelf],
				});
			} else {
				groups.get(key)!.shelves.push(shelf);
			}
		}

		return Array.from(groups.values())
			.map((group) => ({
				...group,
				shelves: [...group.shelves].sort((a, b) => a.name.localeCompare(b.name)),
			}))
			.sort((a, b) => {
				if (a.buildingLabel !== b.buildingLabel) {
					return a.buildingLabel.localeCompare(b.buildingLabel);
				}
				return a.roomLabel.localeCompare(b.roomLabel);
			});
	}, [filteredShelves]);

	const handleToggleShelf = useCallback(
		(shelf: ApiShelf) => {
			setExpandedShelfId((current) => {
				if (current === shelf.id) {
					return null;
				}

				const existingState = inventoryState[shelf.id];
				if (!existingState || existingState.error) {
					void loadShelfInventory(shelf);
				}

				return shelf.id;
			});
		},
		[inventoryState, loadShelfInventory],
	);

	return (
		<div className="container mx-auto max-w-6xl space-y-10 py-10">
			<header className="flex flex-col gap-3">
				<h1 className="text-3xl font-semibold tracking-tight">Shelves</h1>
				<p className="text-sm text-muted-foreground">
					Browse shelves by room and dig into the inventory of each shelf unit. Use the filters
					to narrow things down by building or room, or search by name and ID.
				</p>
			</header>

			<section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
				<div className="grid gap-4 md:grid-cols-3">
					<label className="flex flex-col gap-2">
						<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Search
						</span>
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search by shelf ID, name, building, or room"
							className="h-10"
						/>
					</label>

					<label className="flex flex-col gap-2">
						<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Building
						</span>
						<select
							value={selectedBuilding}
							onChange={(event) => {
								setSelectedBuilding(event.target.value);
								setSelectedRoom("all");
							}}
							className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<option value="all">All buildings</option>
							{buildingOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>

					<label className="flex flex-col gap-2">
						<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Room
						</span>
						<select
							value={selectedRoom}
							onChange={(event) => setSelectedRoom(event.target.value)}
							className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<option value="all">All rooms</option>
							{roomOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
				</div>
			</section>

			{error ? (
				<div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
					{error}
				</div>
			) : null}

			{loading ? (
				<div className="rounded-2xl border border-border/50 bg-card p-8 text-center text-sm text-muted-foreground">
					Loading shelves…
				</div>
			) : groupedShelves.length === 0 ? (
				<div className="rounded-2xl border border-border/50 bg-card p-8 text-center text-sm text-muted-foreground">
					No shelves match the current filters.
				</div>
			) : (
				<div className="space-y-6">
					{groupedShelves.map((group) => (
						<section
							key={group.key}
							className="overflow-hidden rounded-3xl border border-border/60 bg-background/70 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 bg-muted/40 p-6">
								<div className="space-y-1">
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Room
									</p>
									<h2 className="text-2xl font-semibold leading-tight text-foreground">
										{group.roomLabel}
									</h2>
								</div>
								<div className="space-y-1 text-sm text-muted-foreground">
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Building
									</p>
									<span className="text-base font-medium text-foreground">
										{group.buildingLabel}
									</span>
								</div>
							</div>

							<div className="divide-y divide-border/60">
								{group.shelves.map((shelf) => {
									const totalUnits =
										typeof shelf.numElements === "number" && Number.isFinite(shelf.numElements)
											? shelf.numElements
											: shelf.columns.reduce(
													(sum, column) => sum + column.elements.length,
													0,
												);
									const totalColumns = shelf.columns.length;
									const isExpanded = expandedShelfId === shelf.id;
									const state = inventoryState[shelf.id];

									return (
										<article
											key={shelf.id}
											className="group flex flex-col gap-4 p-6 transition-colors hover:bg-muted/30"
										>
											<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
												<div className="space-y-1">
													<h3 className="text-lg font-semibold leading-tight">
														{shelf.name}
													</h3>
													<p className="text-sm text-muted-foreground">Shelf ID {shelf.id}</p>
												</div>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleToggleShelf(shelf)}
												>
													{isExpanded ? "Hide inventory" : "View inventory"}
												</Button>
											</div>

											<div className="grid gap-3 text-sm sm:grid-cols-2">
												<div className="rounded-lg border border-border/60 bg-background/80 p-3">
													<p className="text-xs uppercase tracking-wide text-muted-foreground">
														Columns
													</p>
													<p className="text-base font-medium text-foreground">{totalColumns}</p>
												</div>
												<div className="rounded-lg border border-border/60 bg-background/80 p-3">
													<p className="text-xs uppercase tracking-wide text-muted-foreground">
														Shelf units
													</p>
													<p className="text-base font-medium text-foreground">{totalUnits}</p>
												</div>
											</div>

											{isExpanded ? (
												<div className="rounded-2xl border border-border/60 bg-card/80 p-5">
													<div className="mb-4 flex items-center justify-between">
														<p className="text-sm font-medium text-foreground">Inventory</p>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => void loadShelfInventory(shelf)}
															disabled={state?.loading}
														>
															Refresh
														</Button>
													</div>
													{!state || state.loading ? (
														<p className="text-sm text-muted-foreground">Loading inventory…</p>
													) : state.error ? (
														<p className="text-sm text-destructive">{state.error}</p>
													) : state.units.length === 0 ? (
														<p className="text-sm text-muted-foreground">
															This shelf does not contain any recorded shelf units yet.
														</p>
													) : (
														state.units.map((unit) => (
															<div key={unit.unitId} className="space-y-3 py-3 first:pt-0 last:pb-0">
																<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
																	<h4 className="text-sm font-medium">Unit {unit.unitId}</h4>
																	<span className="text-xs text-muted-foreground">
																		{asCount(
																			unit.items.reduce(
																				(sum, item) => sum + asCount(item.available),
																				0,
																			),
																		).toLocaleString()}{" "}
																		available
																	</span>
																</div>

																{unit.items.length === 0 ? (
																	<p className="text-sm text-muted-foreground">
																		No inventory stored in this unit.
																	</p>
																) : (
																	<ul className="space-y-3">
																		{unit.items.map((item, index) => {
																			const inventoryId =
																				typeof item.inventory_id === "number"
																					? item.inventory_id
																					: null;
																			const actionState =
																				inventoryId !== null
																					? itemActions[shelf.id]?.[inventoryId]
																					: undefined;
																			const amountValue =
																				inventoryId !== null
																					? amountEdits[shelf.id]?.[inventoryId] ?? ""
																					: "";

																			return (
																				<li
																					key={`${unit.unitId}-${item.inventory_id ?? item.item_id ?? index}`}
																					className="rounded-xl border border-border/50 bg-background/70 p-4 text-sm shadow-sm"
																				>
																					<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
																						<div>
																							<p className="font-medium leading-tight">
																								{typeof item.item_id === "number" ? (
																									<Link
																										to={`/items/${item.item_id}`}
																										className="text-primary underline-offset-2 hover:underline"
																									>
																										{item.item_name ??
																											`Item #${item.item_id}`}
																									</Link>
																								) : (
																									item.item_name ?? "Unknown item"
																								)}
																							</p>
																							{item.category ? (
																								<p className="text-xs uppercase tracking-wide text-muted-foreground">
																									{item.category}
																								</p>
																							) : null}
																							{typeof item.item_id === "number" ? (
																								<p className="text-xs font-mono text-muted-foreground">
																									Item ID: {item.item_id}
																								</p>
																							) : null}
																						</div>
																						<p className="text-xs text-muted-foreground">
																							{asCount(item.available).toLocaleString()}{" "}
																							available ·{" "}
																							{asCount(item.borrowed).toLocaleString()}{" "}
																							borrowed
																						</p>
																					</div>
																					{item.note ? (
																						<p className="mt-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
																							Note: {item.note}
																						</p>
																					) : null}
																					{item.active_loans && item.active_loans.length > 0 ? (
																						<ul className="mt-2 space-y-1 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
																							{item.active_loans.map((loan, loanIndex) => (
																								<li
																									key={`${loan.loan_id ?? loan.person_id ?? loanIndex}`}
																								>
																									{loan.person_name ??
																										`Person #${loan.person_id ?? "unknown"}`}{" "}
																									has {asCount(loan.amount)} until{" "}
																									{loan.until ?? "—"}
																									{loan.is_overdue ? " (overdue)" : ""}
																								</li>
																							))}
																						</ul>
																					) : null}
																					{inventoryId !== null ? (
																						<div className="mt-4 space-y-3">
																							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
																								<label
																									className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-32"
																									htmlFor={`inventory-amount-${inventoryId}`}
																								>
																									Total amount
																								</label>
																								<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
																									<Input
																										id={`inventory-amount-${inventoryId}`}
																										type="number"
																										min={0}
																										step={1}
																										value={amountValue}
																										onChange={(event) =>
																											handleAmountInputChange(
																												shelf.id,
																												inventoryId,
																												event.target.value,
																											)
																										}
																										className="h-9 w-full sm:w-28"
																									/>
																									<div className="flex gap-2">
																										<Button
																											variant="secondary"
																											size="sm"
																											disabled={actionState?.saving}
																											onClick={() =>
																												void handleUpdateAmount(
																													shelf,
																													inventoryId,
																												)
																											}
																										>
																											{actionState?.saving ? "Saving…" : "Save"}
																										</Button>
																										<Button
																											variant="destructive"
																											size="sm"
																											disabled={actionState?.saving}
																											onClick={() =>
																												void handleDeleteInventory(
																													shelf,
																													inventoryId,
																												)
																											}
																										>
																											Remove
																										</Button>
																									</div>
																								</div>
																							</div>
																							{actionState?.error ? (
																								<p className="text-xs text-destructive">
																									{actionState.error}
																								</p>
																							) : null}
																							{actionState?.success ? (
																								<p className="text-xs text-emerald-600">
																									{actionState.success}
																								</p>
																							) : null}
																						</div>
																					) : null}
																				</li>
																			);
																		})}
																	</ul>
																)}
															</div>
														))
													)}
												</div>
											) : null}
										</article>
									);
								})}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
}
