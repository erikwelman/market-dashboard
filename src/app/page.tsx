"use client";

import { useState, useEffect, useMemo } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Navigation } from "@/components/layout/navigation";
import { Header } from "@/components/layout/header";
import { MarketOverviewCards } from "@/components/market-overview/market-overview-cards";
import { WatchlistPanel } from "@/components/watchlist/watchlist-panel";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { InstrumentSearchModal } from "@/components/instrument-detail/instrument-search-modal";
import { AlertToast } from "@/components/alerts/alert-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useWatchlistAlerts } from "@/hooks/use-watchlist-alerts";
import { useQuotes } from "@/hooks/use-quotes";

export default function DashboardPage() {
  const { instruments, addInstrument, removeInstrument, loaded } = useWatchlist();
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const {
    alerts,
    loaded: alertsLoaded,
    newlyTriggered,
    checkAlerts,
    dismissNewlyTriggered,
  } = useWatchlistAlerts();

  // Get symbols that have active, untriggered alerts
  const alertSymbols = useMemo(
    () => [...new Set(alerts.filter((a) => a.active && !a.triggered).map((a) => a.symbol))],
    [alerts]
  );

  // Poll quotes for alert symbols (30s interval via useQuotes)
  const { data: alertQuotes } = useQuotes(alertSymbols);

  // Check alerts against live quotes
  useEffect(() => {
    if (alertsLoaded && alertQuotes && alertQuotes.length > 0) {
      checkAlerts(alertQuotes);
    }
  }, [alertQuotes, alertsLoaded, checkAlerts]);

  return (
    <AppShell>
      <Header />
      <Navigation />

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

      {/* Alert toast popup */}
      <AlertToast
        alerts={newlyTriggered}
        onDismiss={dismissNewlyTriggered}
      />
    </AppShell>
  );
}
