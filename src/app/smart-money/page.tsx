"use client";

import { useState } from "react";
import type { TrackedInvestor } from "@/lib/investor-data/types";
import type { Instrument } from "@/lib/market-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Navigation } from "@/components/layout/navigation";
import { Header } from "@/components/layout/header";
import { SubNavigation } from "@/components/layout/sub-navigation";
import { InvestorWatchlistPanel } from "@/components/smart-money/investor-watchlist-panel";
import { InvestorDetailPanel } from "@/components/smart-money/investor-detail-panel";
import { InvestorSearchModal } from "@/components/smart-money/investor-search-modal";
import { SmartMoneyTrendSummary } from "@/components/smart-money/smart-money-trend-summary";
import { SectorHeatmapView } from "@/components/smart-money/sector-heatmap-view";
import { ConvictionView } from "@/components/smart-money/conviction-view";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useInvestorWatchlist } from "@/hooks/use-investor-watchlist";

const SMART_MONEY_TABS = [
  { key: "investors", label: "Investors" },
  { key: "consensus", label: "Consensus" },
  { key: "sector-flow", label: "Sector Flow" },
  { key: "conviction", label: "Conviction" },
];

export default function SmartMoneyPage() {
  const [activeTab, setActiveTab] = useState("investors");
  const {
    investors,
    addInvestor,
    removeInvestor,
  } = useInvestorWatchlist();
  const [selectedInvestor, setSelectedInvestor] = useState<TrackedInvestor | null>(null);
  const [showInvestorSearch, setShowInvestorSearch] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);

  const ciks = investors.map((i) => i.cik);

  return (
    <AppShell>
      <Header />
      <Navigation />

      <SubNavigation
        tabs={SMART_MONEY_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "investors" && (
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
      )}

      {activeTab === "consensus" && (
        <ErrorBoundary sectionName="Smart Money Consensus">
          <SmartMoneyTrendSummary ciks={ciks} />
        </ErrorBoundary>
      )}

      {activeTab === "sector-flow" && (
        <ErrorBoundary sectionName="Sector Flow">
          <SectorHeatmapView ciks={ciks} />
        </ErrorBoundary>
      )}

      {activeTab === "conviction" && (
        <ErrorBoundary sectionName="Conviction">
          <ConvictionView
            ciks={ciks}
            onSelectInstrument={setSelectedInstrument}
          />
        </ErrorBoundary>
      )}

      {selectedInvestor && (
        <InvestorDetailPanel
          investor={selectedInvestor}
          onClose={() => setSelectedInvestor(null)}
        />
      )}

      {selectedInstrument && (
        <InstrumentDetailPanel
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
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
