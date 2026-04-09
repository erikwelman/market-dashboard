"use client";

import { useState, useEffect, useRef } from "react";
import { useSearch } from "@/hooks/use-search";
import type { PaperPortfolio } from "@/lib/alert-types";

interface TransactionModalProps {
  portfolio: PaperPortfolio;
  onClose: () => void;
  onSubmit: (transaction: {
    type: "BUY" | "SELL";
    symbol: string;
    shares: number;
    price: number;
    date: string;
    note?: string;
  }) => { success: boolean; error?: string };
  prefillSymbol?: string;
}

export function TransactionModal({
  portfolio,
  onClose,
  onSubmit,
  prefillSymbol,
}: TransactionModalProps) {
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [symbolQuery, setSymbolQuery] = useState(prefillSymbol ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState(prefillSymbol ?? "");
  const [showResults, setShowResults] = useState(false);
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading: searchLoading } =
    useSearch(debouncedQuery);

  useEffect(() => {
    if (!prefillSymbol) {
      inputRef.current?.focus();
    }
  }, [prefillSymbol]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(symbolQuery), 300);
    return () => clearTimeout(timer);
  }, [symbolQuery]);

  // Auto-fetch current price when symbol is selected
  useEffect(() => {
    if (!selectedSymbol) return;
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          `/api/portfolio/quotes?symbols=${encodeURIComponent(selectedSymbol)}`
        );
        if (res.ok) {
          const quotes = await res.json();
          if (quotes.length > 0 && !price) {
            setPrice(quotes[0].price.toFixed(2));
          }
        }
      } catch {
        // ignore, user can enter price manually
      }
    };
    fetchPrice();
    // Only run when symbol changes, not when price changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  const handleSelectResult = (result: {
    symbol: string;
    name: string;
  }) => {
    setSelectedSymbol(result.symbol);
    setSymbolQuery(result.symbol);
    setShowResults(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSymbol) {
      setError("Please select a valid symbol.");
      return;
    }

    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(price);

    if (!sharesNum || sharesNum <= 0) {
      setError("Shares must be greater than 0.");
      return;
    }
    if (!priceNum || priceNum <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }

    const result = onSubmit({
      type,
      symbol: selectedSymbol,
      shares: sharesNum,
      price: priceNum,
      date,
      note: note.trim() || undefined,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to add transaction.");
    } else {
      onClose();
    }
  };

  const existingPosition = portfolio.positions.find(
    (p) => p.symbol === selectedSymbol
  );
  const currentHeld = existingPosition?.shares ?? 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
        <div className="bg-surface-1 border border-border rounded-lg w-full max-w-md shadow-2xl">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-medium text-text-primary">
              Add Transaction
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* BUY / SELL toggle */}
            <div className="flex gap-1 bg-surface-2 rounded p-1">
              <button
                type="button"
                onClick={() => setType("BUY")}
                className={`flex-1 text-xs font-medium py-1.5 rounded transition-colors ${
                  type === "BUY"
                    ? "bg-gain-bg text-gain"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setType("SELL")}
                className={`flex-1 text-xs font-medium py-1.5 rounded transition-colors ${
                  type === "SELL"
                    ? "bg-loss-bg text-loss"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                SELL
              </button>
            </div>

            {/* Symbol search */}
            <div className="relative">
              <label
                htmlFor="tx-symbol"
                className="block text-xs text-text-secondary mb-1"
              >
                Symbol
              </label>
              <input
                id="tx-symbol"
                ref={inputRef}
                type="text"
                value={symbolQuery}
                onChange={(e) => {
                  setSymbolQuery(e.target.value);
                  setSelectedSymbol("");
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search for a symbol..."
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
              />
              {showResults &&
                debouncedQuery.length >= 2 &&
                !selectedSymbol && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-1 border border-border rounded-lg shadow-xl max-h-[200px] overflow-y-auto z-10">
                    {searchLoading && (
                      <div className="px-4 py-3 text-xs text-text-muted text-center">
                        Searching...
                      </div>
                    )}
                    {searchResults && searchResults.length === 0 && (
                      <div className="px-4 py-3 text-xs text-text-muted text-center">
                        No results found
                      </div>
                    )}
                    {searchResults?.map((result) => (
                      <button
                        key={result.symbol}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0"
                      >
                        <span className="text-xs font-medium text-text-primary">
                          {result.symbol}
                        </span>
                        <span className="text-xs text-text-muted ml-2 truncate">
                          {result.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              {selectedSymbol && (
                <div className="text-xs text-gain mt-1">
                  Selected: {selectedSymbol}
                  {currentHeld > 0 && (
                    <span className="text-text-muted ml-2">
                      (holding {currentHeld} shares)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Shares & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tx-shares"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Shares
                </label>
                <input
                  id="tx-shares"
                  type="number"
                  step="any"
                  min="0"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="tx-price"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Price per Share
                </label>
                <input
                  id="tx-price"
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Total preview */}
            {shares && price && parseFloat(shares) > 0 && parseFloat(price) > 0 && (
              <div className="text-xs text-text-secondary bg-surface-2 rounded px-3 py-2">
                Total: ${(parseFloat(shares) * parseFloat(price)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}

            {/* Date */}
            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs text-text-secondary mb-1"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Note */}
            <div>
              <label
                htmlFor="tx-note"
                className="block text-xs text-text-secondary mb-1"
              >
                Note (optional)
              </label>
              <input
                id="tx-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-loss bg-loss-bg rounded px-3 py-2">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-text-secondary hover:text-text-primary font-medium transition-colors px-3 py-2 rounded hover:bg-surface-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`text-xs font-medium transition-colors px-3 py-2 rounded ${
                  type === "BUY"
                    ? "bg-gain text-surface-0 hover:brightness-110"
                    : "bg-loss text-surface-0 hover:brightness-110"
                }`}
              >
                {type === "BUY" ? "Buy" : "Sell"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
