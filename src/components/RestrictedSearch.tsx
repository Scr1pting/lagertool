// components/RestrictedSearch.tsx
"use client";

import * as React from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export type RestrictedSearchItem = {
  id: number | string;
  label: string;
  description?: string;
  [key: string]: unknown;
};

type Props = {
  onSelect: (item: RestrictedSearchItem) => void;
  searchFn: (query: string, limit: number) => Promise<RestrictedSearchItem[]>;
  placeholder?: string;
  minChars?: number;
  limit?: number;
  selectedLabel?: string;
  renderItem?: (item: RestrictedSearchItem) => React.ReactNode;
};

export default function RestrictedSearch({
  onSelect,
  searchFn,
  placeholder = "Search…",
  minChars = 2,
  limit = 8,
  selectedLabel,
  renderItem,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<RestrictedSearchItem[]>([]);
  const [displayLabel, setDisplayLabel] = React.useState(selectedLabel ?? "");
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setDisplayLabel(selectedLabel ?? "");
  }, [selectedLabel]);

  React.useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < minChars) {
      setResults([]);
      return;
    }
    setLoading(true);
    setOpen(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const id = setTimeout(async () => {
      try {
        const data = await searchFn(trimmed, limit);
        if (!ctrl.signal.aborted) {
          setResults(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ctrl.signal.aborted) {
          console.error("RestrictedSearch search error:", error);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [query, limit, minChars, searchFn]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full max-w-md justify-between"
          onClick={() => setOpen((o) => !o)}
        >
          {displayLabel || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              if (displayLabel) {
                setDisplayLabel("");
              }
            }}
            placeholder={placeholder}
          />
          {query.trim().length < minChars ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Type at least {minChars} characters…
            </div>
          ) : (
            <CommandList>
              <CommandEmpty>
                {loading ? "Searching…" : "No results found"}
              </CommandEmpty>
              <CommandGroup>
                {results.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.description ?? ""}`}
                    onSelect={() => {
                      onSelect(item);
                      setDisplayLabel(item.label);
                      setOpen(false);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    {renderItem ? (
                      renderItem(item)
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        {item.description ? (
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
