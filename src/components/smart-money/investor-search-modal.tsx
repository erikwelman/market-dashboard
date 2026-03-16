"use client";

import { useState, useEffect, useRef } from "react";
import { useInvestorSearch } from "@/hooks/use-investor-search";
import type { TrackedInvestor } from "@/lib/investor-data/types";
import { cn } from "@/lib/utils";

interface InvestorSearchModalProps {
  onAdd: (investor: TrackedInvestor) => void;
  onClose: () => void;
}

function isStale(filingDate: string | undefined): boolean {
  if (!filingDate) return true;
  const filed = new Date(filingDate + "T00:00:00");
  const now = new Date();
  const monthsAgo =
    (now.getFullYear() - filed.getFullYear()) * 12 +
    (now.getMonth() - filed.getMonth());
  return monthsAgo > 6;
}

function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvestorSearchModal({
  onAdd,
  onClose,
}: InvestorSearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: results, isLoading } = useInvestorSearch(debouncedQuery);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: { cik: string; name: string }) => {
    onAdd({ cik: result.cik, name: result.name });
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
              placeholder="Search investors / funds (e.g. Berkshire, Bridgewater)..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {isLoading && debouncedQuery.length >= 2 && (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                Searching SEC EDGAR...
              </div>
            )}
            {results && results.length === 0 && debouncedQuery.length >= 2 && (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                No 13F filers found
              </div>
            )}
            {results?.map((result) => {
              const stale = isStale(result.latestFilingDate);
              return (
                <button
                  key={result.cik}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0",
                    stale && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {result.name}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono shrink-0">
                      CIK {result.cik}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {result.latestFilingDate ? (
                      <>
                        <span
                          className={cn(
                            "text-xs",
                            stale
                              ? "text-text-muted"
                              : "text-text-secondary"
                          )}
                        >
                          Latest 13F:{" "}
                          {formatDate(result.latestFilingDate)}
                        </span>
                        {stale && (
                          <span className="text-[10px] font-medium text-loss bg-loss-bg px-1.5 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-text-muted">
                        No recent 13F filings
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
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
