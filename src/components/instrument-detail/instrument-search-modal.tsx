"use client";

import { useState, useEffect, useRef } from "react";
import { useSearch } from "@/hooks/use-search";
import type { Instrument } from "@/lib/market-data/types";

interface InstrumentSearchModalProps {
  onAdd: (instrument: Instrument) => void;
  onClose: () => void;
}

export function InstrumentSearchModal({ onAdd, onClose }: InstrumentSearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: results, isLoading } = useSearch(debouncedQuery);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: { symbol: string; name: string; exchange: string; type: string }) => {
    const instrument: Instrument = {
      symbol: result.symbol.replace(/\.AX$|\.AS$/, ""),
      providerSymbol: result.symbol,
      name: result.name,
      exchange: result.exchange,
      type: result.type === "CRYPTOCURRENCY" ? "crypto" : result.type === "INDEX" ? "index" : "equity",
    };
    onAdd(instrument);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        <div className="bg-surface-1 border border-border rounded-lg w-full max-w-md shadow-2xl">
          <div className="p-4 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search instruments..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading && debouncedQuery.length >= 2 && (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                Searching...
              </div>
            )}
            {results && results.length === 0 && debouncedQuery.length >= 2 && (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                No results found
              </div>
            )}
            {results?.map((result) => (
              <button
                key={result.symbol}
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-text-primary">
                      {result.symbol}
                    </span>
                    <span className="text-xs text-text-muted ml-2">
                      {result.exchange}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted uppercase">
                    {result.type}
                  </span>
                </div>
                <div className="text-xs text-text-secondary truncate mt-0.5">
                  {result.name}
                </div>
              </button>
            ))}
            {!results && debouncedQuery.length < 2 && (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
