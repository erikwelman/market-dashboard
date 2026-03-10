"use client";

import { useState } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MarketOverviewCards } from "@/components/market-overview/market-overview-cards";
import { WatchlistPanel } from "@/components/watchlist/watchlist-panel";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { InstrumentSearchModal } from "@/components/instrument-detail/instrument-search-modal";
import { useWatchlist } from "@/hooks/use-watchlist";

export default function Home() {
  const { instruments, addInstrument, removeInstrument } = useWatchlist();
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <AppShell>
      <Header />

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Markets
        </h2>
        <MarketOverviewCards />
      </section>

      <section>
        <WatchlistPanel
          instruments={instruments}
          onAddClick={() => setShowSearch(true)}
          onSelectInstrument={setSelectedInstrument}
          onRemoveInstrument={removeInstrument}
        />
      </section>

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
