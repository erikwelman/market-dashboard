"use client";

import { useState } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Navigation } from "@/components/layout/navigation";
import { Header } from "@/components/layout/header";
import { EarningsCalendarView } from "@/components/research/earnings-calendar-view";
import { InsiderFeed } from "@/components/research/insider-feed";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useWatchlist } from "@/hooks/use-watchlist";

export default function ResearchPage() {
  const { instruments } = useWatchlist();
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);

  const symbols = instruments.map((i) => i.providerSymbol);

  return (
    <AppShell>
      <Header />
      <Navigation />

      <ErrorBoundary sectionName="Earnings Calendar">
        <section className="mb-8">
          <EarningsCalendarView
            symbols={symbols}
            instruments={instruments}
            onSelectInstrument={setSelectedInstrument}
          />
        </section>
      </ErrorBoundary>

      <ErrorBoundary sectionName="Insider Activity">
        <section className="mb-8">
          <InsiderFeed
            symbols={symbols}
            onSelectInstrument={setSelectedInstrument}
            instruments={instruments}
          />
        </section>
      </ErrorBoundary>

      {selectedInstrument && (
        <InstrumentDetailPanel
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      )}
    </AppShell>
  );
}
