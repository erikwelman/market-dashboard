"use client";

import { useState, useEffect, useRef } from "react";
import type { WatchlistAlert } from "@/lib/alert-types";
import { useQuotes } from "@/hooks/use-quotes";
import { useSearch } from "@/hooks/use-search";
import { formatCurrency, cn } from "@/lib/utils";

interface AlertCreatorProps {
  symbol?: string;
  currency?: string;
  onAdd: (alert: Omit<WatchlistAlert, "id" | "createdAt" | "triggered" | "active" | "read">) => void;
  onClose: () => void;
}

const ALERT_TYPES = [
  { value: "PRICE_ABOVE" as const, label: "Price Above" },
  { value: "PRICE_BELOW" as const, label: "Price Below" },
  { value: "PCT_CHANGE_UP" as const, label: "% Move Up" },
  { value: "PCT_CHANGE_DOWN" as const, label: "% Move Down" },
];

export function AlertCreator({ symbol: initialSymbol, currency = "USD", onAdd, onClose }: AlertCreatorProps) {
  const [symbol, setSymbol] = useState(initialSymbol ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSearch, setShowSearch] = useState(!initialSymbol);
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<WatchlistAlert["type"]>("PRICE_ABOVE");
  const [threshold, setThreshold] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading: searchLoading } = useSearch(debouncedQuery);
  const { data: quotes } = useQuotes(symbol ? [symbol] : []);
  const currentPrice = quotes?.[0]?.price;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (showSearch) {
      inputRef.current?.focus();
    }
  }, [showSearch]);

  const isPercentType = type === "PCT_CHANGE_UP" || type === "PCT_CHANGE_DOWN";

  const handleSelectSymbol = (result: { symbol: string; name: string }) => {
    setSymbol(result.symbol);
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(threshold);
    if (isNaN(value) || value <= 0 || !symbol) return;

    onAdd({ symbol, type, action, threshold: value });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        <div className="bg-surface-1 border border-border rounded-lg w-full max-w-sm shadow-2xl">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Create Price Alert
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Symbol Selection */}
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-2">
                Stock
              </label>
              {showSearch ? (
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a stock..."
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                  />
                  {debouncedQuery.length >= 2 && (
                    <div className="max-h-[180px] overflow-y-auto border border-border rounded mt-1 bg-surface-2">
                      {searchLoading && (
                        <div className="px-3 py-4 text-center text-text-muted text-xs">
                          Searching...
                        </div>
                      )}
                      {searchResults && searchResults.length === 0 && (
                        <div className="px-3 py-4 text-center text-text-muted text-xs">
                          No results
                        </div>
                      )}
                      {searchResults?.map((result) => (
                        <button
                          key={result.symbol}
                          type="button"
                          onClick={() => handleSelectSymbol(result)}
                          className="w-full text-left px-3 py-2 hover:bg-surface-3 transition-colors border-b border-border/50 last:border-b-0"
                        >
                          <span className="text-sm font-medium text-text-primary">
                            {result.symbol}
                          </span>
                          <span className="text-xs text-text-muted ml-2">
                            {result.exchange}
                          </span>
                          <div className="text-xs text-text-secondary truncate">
                            {result.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="w-full flex items-center justify-between bg-surface-2 border border-border rounded px-3 py-2 text-sm hover:border-accent transition-colors"
                >
                  <span className="text-text-primary font-medium">{symbol}</span>
                  {currentPrice != null && (
                    <span className="text-text-muted text-xs tabular-nums">
                      {formatCurrency(currentPrice, currency)}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Buy / Sell */}
            {symbol && !showSearch && (
              <>
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-2">
                    Action
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setAction("BUY")}
                      className={cn(
                        "px-3 py-2 text-xs font-semibold rounded transition-colors",
                        action === "BUY"
                          ? "text-gain bg-gain/15 ring-1 ring-gain/30"
                          : "text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3"
                      )}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction("SELL")}
                      className={cn(
                        "px-3 py-2 text-xs font-semibold rounded transition-colors",
                        action === "SELL"
                          ? "text-loss bg-loss/15 ring-1 ring-loss/30"
                          : "text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3"
                      )}
                    >
                      Sell
                    </button>
                  </div>
                </div>

                {/* Alert Type */}
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-2">
                    Condition
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {ALERT_TYPES.map((at) => (
                      <button
                        key={at.value}
                        type="button"
                        onClick={() => setType(at.value)}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded transition-colors",
                          type === at.value
                            ? "text-accent bg-accent/10"
                            : "text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3"
                        )}
                      >
                        {at.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Threshold */}
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-2">
                    {isPercentType ? "Percentage (%)" : `Target Price (${currency})`}
                  </label>
                  <input
                    type="number"
                    step={isPercentType ? "0.1" : "0.01"}
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder={isPercentType ? "e.g. 5" : currentPrice ? currentPrice.toFixed(2) : "0.00"}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors tabular-nums"
                    autoFocus={!showSearch}
                  />
                </div>

                {/* Preview */}
                {threshold && !isNaN(parseFloat(threshold)) && (
                  <div className="text-xs text-text-secondary bg-surface-2 rounded px-3 py-2">
                    <span className={cn("font-semibold", action === "BUY" ? "text-gain" : "text-loss")}>
                      {action}
                    </span>
                    {" "}alert: {symbol}{" "}
                    {type === "PRICE_ABOVE" && `is at or above ${formatCurrency(parseFloat(threshold), currency)}`}
                    {type === "PRICE_BELOW" && `is at or below ${formatCurrency(parseFloat(threshold), currency)}`}
                    {type === "PCT_CHANGE_UP" && `moves up ${parseFloat(threshold)}% in a day`}
                    {type === "PCT_CHANGE_DOWN" && `moves down ${parseFloat(threshold)}% in a day`}
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!symbol || !threshold || isNaN(parseFloat(threshold)) || parseFloat(threshold) <= 0 || showSearch}
                className="px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create Alert
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
