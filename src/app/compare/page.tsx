"use client";

import { useState } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Navigation } from "@/components/layout/navigation";
import { Header } from "@/components/layout/header";
import { CompareTable, type CompareRow } from "@/components/compare/compare-table";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { InstrumentSearchModal } from "@/components/instrument-detail/instrument-search-modal";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompareSymbols } from "@/hooks/use-compare-symbols";
import { useCompareFundamentals } from "@/hooks/use-compare-fundamentals";

export default function ComparePage() {
  const { instruments, addInstrument, removeInstrument, loaded } = useCompareSymbols();
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const results = useCompareFundamentals(
    instruments.map((i) => i.providerSymbol)
  );

  const rows: CompareRow[] = instruments.map((instrument, index) => ({
    instrument,
    data: results[index]?.data,
    isLoading: results[index]?.isLoading ?? true,
    isError: results[index]?.isError ?? false,
  }));

  return (
    <AppShell>
      <Header />
      <Navigation />

      <ErrorBoundary sectionName="Compare">
        <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Peer Comparison
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Valuation, profitability, and analyst consensus across your
                watchlist — cells colored vs. peer median
              </p>
            </div>
            <button
              onClick={() => setShowSearch(true)}
              className="text-xs text-accent hover:text-accent-hover font-medium transition-colors px-2 py-1 rounded hover:bg-surface-3 shrink-0"
            >
              + Add symbol
            </button>
          </div>

          {!loaded ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 bg-surface-2/40 rounded animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="Add symbols to compare" />
          ) : (
            <CompareTable
              rows={rows}
              onSelect={setSelectedInstrument}
              onRemove={removeInstrument}
            />
          )}
        </div>
      </ErrorBoundary>

      {selectedInstrument && (
        <InstrumentDetailPanel
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      )}

      {showSearch && (
        <InstrumentSearchModal
          onAdd={addInstrument}
          onClose={() => setShowSearch(false)}
        />
      )}
    </AppShell>
  );
}
