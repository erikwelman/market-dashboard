"use client";

import { useState, useEffect, useRef } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { useConviction } from "@/hooks/use-conviction";
import { useSearch } from "@/hooks/use-search";
import { ConvictionTimeline } from "./conviction-timeline";
import { ConvictionSummary } from "./conviction-summary";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface ConvictionViewProps {
  ciks: string[];
  onSelectInstrument: (instrument: Instrument) => void;
}

function ConvictionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-3 rounded" />
        ))}
      </div>
      <div className="h-64 bg-surface-3 rounded" />
    </div>
  );
}

export function ConvictionView({ ciks, onSelectInstrument }: ConvictionViewProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data: searchResults, isLoading: searchLoading } =
    useSearch(debouncedQuery);

  const {
    data: convictionData,
    isLoading: convictionLoading,
    error: convictionError,
    refetch,
  } = useConviction(selectedSymbol, ciks);

  const handleSelectResult = (result: { symbol: string; name: string; exchange: string; type: string }) => {
    setSelectedSymbol(result.symbol);
    setSearchInput(result.symbol);
    setShowDropdown(false);

    onSelectInstrument({
      symbol: result.symbol,
      providerSymbol: result.symbol,
      name: result.name,
      exchange: result.exchange,
      type: result.type === "EQUITY" ? "equity" : "equity",
    });
  };

  if (ciks.length === 0) {
    return (
      <div className="bg-surface-1 border border-border rounded-lg">
        <EmptyState message="Add investors to track conviction history" />
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Conviction Tracking
          </h2>
          <p className="text-[10px] text-text-muted mt-0.5">
            Track how long investors have held specific positions
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-border">
        <div ref={dropdownRef} className="relative max-w-md">
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (searchInput.length >= 2) setShowDropdown(true);
            }}
            placeholder="Search for a stock symbol (e.g. AAPL, MSFT)..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />

          {/* Search dropdown */}
          {showDropdown && debouncedQuery.length >= 2 && (
            <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchLoading && (
                <div className="px-3 py-2 text-xs text-text-muted">
                  Searching...
                </div>
              )}
              {searchResults && searchResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-text-muted">
                  No results found
                </div>
              )}
              {searchResults &&
                searchResults.map((result) => (
                  <button
                    key={`${result.symbol}-${result.exchange}`}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-3 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-medium text-text-primary">
                        {result.symbol}
                      </span>
                      <span className="text-[11px] text-text-secondary ml-2">
                        {result.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {result.exchange}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!selectedSymbol && (
          <EmptyState message="Search for a stock symbol to view conviction data across your tracked investors" />
        )}

        {selectedSymbol && convictionLoading && <ConvictionSkeleton />}

        {selectedSymbol && convictionError && (
          <ErrorState
            message="Failed to load conviction data"
            onRetry={() => refetch()}
          />
        )}

        {selectedSymbol && convictionData && (
          <div className="space-y-4">
            <ConvictionSummary data={convictionData} />
            <ConvictionTimeline data={convictionData} />
          </div>
        )}
      </div>
    </div>
  );
}
