"use client";

import { useState } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Navigation } from "@/components/layout/navigation";
import { Header } from "@/components/layout/header";
import { PortfolioManager } from "@/components/portfolio/portfolio-manager";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function PortfolioPage() {
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);

  return (
    <AppShell>
      <Header />
      <Navigation />

      <ErrorBoundary sectionName="Portfolio">
        <PortfolioManager onSelectInstrument={setSelectedInstrument} />
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
