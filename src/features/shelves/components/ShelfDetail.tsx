import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import fetchShelfUnitInventory from "@/api/getShelfUnitInventory";
import type { ShelfUnitInventoryItem } from "@/api/types";

const asCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function ShelfDetail({ elementId }: { elementId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ShelfUnitInventoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchShelfUnitInventory(elementId);
        if (!cancelled) {
          setItems(data);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load inventory");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [elementId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="text-sm text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Items</CardTitle>
          <CardDescription>This shelf unit doesn't contain any items yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Items List */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const hasBorrowedItems = asCount(item.borrowed) > 0;
          const hasActiveLoans = item.active_loans && item.active_loans.length > 0;
          const hasOverdueLoans = hasActiveLoans && item.active_loans?.some(loan => loan.is_overdue);

          return (
            <Card
              key={item.inventory_id ?? item.item_id ?? index}
              className={`transition-all hover:shadow-md ${
                hasOverdueLoans
                  ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                  : hasBorrowedItems
                  ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
                  : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl">
                      {typeof item.item_id === "number" ? (
                        <Link
                          to={`/items/${item.item_id}`}
                          className="text-primary hover:underline underline-offset-4 transition-colors"
                        >
                          {item.item_name ?? `Item #${item.item_id}`}
                        </Link>
                      ) : (
                        <span>{item.item_name ?? "Unknown item"}</span>
                      )}
                    </CardTitle>
                    {item.category && (
                      <CardDescription className="text-xs uppercase tracking-wider font-medium">
                        {item.category}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Available</div>
                      <div className="text-2xl font-bold text-green-600">
                        {asCount(item.available)}
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Borrowed</div>
                      <div className={`text-2xl font-bold ${hasBorrowedItems ? "text-amber-600" : "text-muted-foreground"}`}>
                        {asCount(item.borrowed)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {(item.note || hasActiveLoans) && (
                <CardContent className="space-y-3">
                  {item.note && (
                    <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Note
                      </p>
                      <p className="text-sm">{item.note}</p>
                    </div>
                  )}

                  {hasActiveLoans && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Active Loans
                      </p>
                      <div className="space-y-2">
                        {item.active_loans?.map((loan, loanIndex) => (
                          <div
                            key={loan.loan_id ?? loanIndex}
                            className={`rounded-lg p-3 border ${
                              loan.is_overdue
                                ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                                : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <p className="font-medium text-sm">
                                  {loan.person_name ?? `Person #${loan.person_id ?? "unknown"}`}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>Amount: {asCount(loan.amount)}</span>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span>Until: {loan.until ?? "—"}</span>
                                </div>
                              </div>
                              {loan.is_overdue && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700">
                                  <svg
                                    className="h-3.5 w-3.5 text-red-600 dark:text-red-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                  </svg>
                                  <span className="text-xs font-medium text-red-700 dark:text-red-300">
                                    Overdue
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ShelfDetail;
