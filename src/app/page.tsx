"use client";

import { useState } from "react";
import type { Instrument } from "@/lib/market-data/types";
import type { TrackedInvestor } from "@/lib/investor-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MarketOverviewCards } from "@/components/market-overview/market-overview-cards";
import { WatchlistPanel } from "@/components/watchlist/watchlist-panel";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { InstrumentSearchModal } from "@/components/instrument-detail/instrument-search-modal";
import { InvestorWatchlistPanel } from "@/components/smart-money/investor-watchlist-panel";
import { InvestorDetailPanel } from "@/components/smart-money/investor-detail-panel";
import { InvestorSearchModal } from "@/components/smart-money/investor-search-modal";
import { SmartMoneyTrendSummary } from "@/components/smart-money/smart-money-trend-summary";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useInvestorWatchlist } from "@/hooks/use-investor-watchlist";

export default function Home() {
  const { instruments, addInstrument, removeInstrument, loaded } = useWatchlist();
  const {
    investors,
    addInvestor,
    removeInvestor,
  } = useInvestorWatchlist();
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<TrackedInvestor | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInvestorSearch, setShowInvestorSearch] = useState(false);

  return (
    <AppShell>
      <Header />

      <ErrorBoundary sectionName="Markets">
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Markets
          </h2>
          <MarketOverviewCards />
        </section>
      </ErrorBoundary>

      <ErrorBoundary sectionName="Watchlist">
        <section className="mb-8">
          {loaded ? (
            <WatchlistPanel
              instruments={instruments}
              onAddClick={() => setShowSearch(true)}
              onSelectInstrument={setSelectedInstrument}
              onRemoveInstrument={removeInstrument}
            />
          ) : (
            <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="h-5 w-24 bg-surface-3 rounded animate-pulse" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 border-b border-border last:border-b-0 animate-pulse bg-surface-2/30" />
              ))}
            </div>
          )}
        </section>
      </ErrorBoundary>

      <ErrorBoundary sectionName="Smart Money">
        <section className="mb-8">
          <InvestorWatchlistPanel
            investors={investors}
            onAddClick={() => setShowInvestorSearch(true)}
            onSelectInvestor={setSelectedInvestor}
            onRemoveInvestor={removeInvestor}
          />
        </section>
      </ErrorBoundary>

      <ErrorBoundary sectionName="Smart Money Consensus">
        <section>
          <SmartMoneyTrendSummary ciks={investors.map((i) => i.cik)} />
        </section>
      </ErrorBoundary>

      {selectedInstrument && (
        <InstrumentDetailPanel
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      )}

      {selectedInvestor && (
        <InvestorDetailPanel
          investor={selectedInvestor}
          onClose={() => setSelectedInvestor(null)}
        />
      )}

      {showSearch && (
        <InstrumentSearchModal
          onAdd={addInstrument}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showInvestorSearch && (
        <InvestorSearchModal
          onAdd={addInvestor}
          onClose={() => setShowInvestorSearch(false)}
        />
      )}
    </AppShell>
  );
}
