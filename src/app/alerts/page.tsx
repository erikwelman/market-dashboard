"use client";

import { useState, useEffect, useMemo } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { AppShell } from "@/components/layout/app-shell";
import { Navigation } from "@/components/layout/navigation";
import { Header } from "@/components/layout/header";
import { AlertCreator } from "@/components/alerts/alert-creator";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useWatchlistAlerts } from "@/hooks/use-watchlist-alerts";
import { useQuotes } from "@/hooks/use-quotes";
import { formatCurrency, cn } from "@/lib/utils";

export default function AlertsPage() {
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  const {
    alerts,
    loaded,
    addAlert,
    removeAlert,
    toggleAlert,
    markAllTriggeredAsRead,
    checkAlerts,
  } = useWatchlistAlerts();

  // Mark all triggered alerts as read when visiting the page
  useEffect(() => {
    if (loaded) {
      markAllTriggeredAsRead();
    }
  }, [loaded, markAllTriggeredAsRead]);

  // Get quotes for all alerted symbols to check triggers
  const alertSymbols = useMemo(
    () => [...new Set(alerts.filter((a) => a.active && !a.triggered).map((a) => a.symbol))],
    [alerts]
  );
  const { data: quotes } = useQuotes(alertSymbols);

  // Check alerts against live quotes
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      checkAlerts(quotes);
    }
  }, [quotes, checkAlerts]);

  // Also fetch quotes for triggered alerts so we can show current price
  const allSymbols = useMemo(
    () => [...new Set(alerts.map((a) => a.symbol))],
    [alerts]
  );
  const { data: allQuotes } = useQuotes(allSymbols);
  const quoteMap = useMemo(() => {
    const map = new Map<string, number>();
    allQuotes?.forEach((q) => map.set(q.symbol, q.price));
    return map;
  }, [allQuotes]);

  // Sort: triggered first, then active, then inactive
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      if (a.triggered !== b.triggered) return a.triggered ? -1 : 1;
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts]);

  return (
    <AppShell>
      <Header />
      <Navigation />

      <ErrorBoundary sectionName="Alerts">
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Price Alerts
            </h2>
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded hover:bg-accent/20 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Alert
            </button>
          </div>

          {!loaded ? (
            <AlertsSkeleton />
          ) : alerts.length === 0 ? (
            <div className="bg-surface-1 border border-border rounded-lg py-16 text-center">
              <div className="text-text-muted text-sm mb-3">
                No price alerts set
              </div>
              <button
                onClick={() => setShowCreator(true)}
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
              >
                Create your first alert
              </button>
            </div>
          ) : (
            <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_100px_110px_110px_90px_70px] gap-2 px-4 py-2.5 border-b border-border text-[10px] text-text-muted uppercase tracking-wider font-medium">
                <span>Stock</span>
                <span>Action</span>
                <span>Condition</span>
                <span className="text-right">Target Price</span>
                <span className="text-right">Current Price</span>
                <span className="text-center">Status</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Alert rows */}
              {sortedAlerts.map((alert) => {
                const currentPrice = quoteMap.get(alert.symbol);
                const isPrice = alert.type === "PRICE_ABOVE" || alert.type === "PRICE_BELOW";

                // Determine if the target is currently met (dynamic, not sticky)
                let targetMet = false;
                if (currentPrice != null && alert.active) {
                  switch (alert.type) {
                    case "PRICE_ABOVE":
                      targetMet = currentPrice >= alert.threshold;
                      break;
                    case "PRICE_BELOW":
                      targetMet = currentPrice <= alert.threshold;
                      break;
                    case "PCT_CHANGE_UP": {
                      const q = allQuotes?.find((q) => q.symbol === alert.symbol);
                      if (q) targetMet = q.changePercent >= alert.threshold;
                      break;
                    }
                    case "PCT_CHANGE_DOWN": {
                      const q = allQuotes?.find((q) => q.symbol === alert.symbol);
                      if (q) targetMet = q.changePercent <= -alert.threshold;
                      break;
                    }
                  }
                }

                const rowBg = targetMet
                  ? alert.action === "BUY"
                    ? "bg-gain/8 border-l-2 border-l-gain"
                    : "bg-loss/8 border-l-2 border-l-loss"
                  : alert.active
                    ? ""
                    : "opacity-50";

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "grid grid-cols-[1fr_80px_100px_110px_110px_90px_70px] gap-2 px-4 py-3 border-b border-border/50 items-center transition-colors hover:bg-surface-2/30",
                      rowBg
                    )}
                  >
                    {/* Stock */}
                    <button
                      onClick={() =>
                        setSelectedInstrument({
                          symbol: alert.symbol,
                          providerSymbol: alert.symbol,
                          name: alert.symbol,
                          type: "equity",
                        })
                      }
                      className="text-left"
                    >
                      <span className="text-sm font-semibold text-accent hover:underline">
                        {alert.symbol}
                      </span>
                    </button>

                    {/* Action */}
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-center w-fit",
                        alert.action === "BUY"
                          ? "text-gain bg-gain/15"
                          : "text-loss bg-loss/15"
                      )}
                    >
                      {alert.action}
                    </span>

                    {/* Condition */}
                    <span className="text-xs text-text-secondary">
                      {alert.type === "PRICE_ABOVE" && "Price Above"}
                      {alert.type === "PRICE_BELOW" && "Price Below"}
                      {alert.type === "PCT_CHANGE_UP" && "% Up"}
                      {alert.type === "PCT_CHANGE_DOWN" && "% Down"}
                    </span>

                    {/* Target */}
                    <span className="text-sm text-text-primary tabular-nums text-right font-medium">
                      {isPrice
                        ? formatCurrency(alert.threshold)
                        : `${alert.threshold}%`}
                    </span>

                    {/* Current Price */}
                    <span className="text-sm text-text-secondary tabular-nums text-right">
                      {currentPrice != null
                        ? formatCurrency(currentPrice)
                        : "---"}
                    </span>

                    {/* Status */}
                    <div className="text-center">
                      {targetMet ? (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                            alert.action === "BUY"
                              ? "text-gain bg-gain/15"
                              : "text-loss bg-loss/15"
                          )}
                        >
                          {alert.action === "BUY" ? "Buy Now" : "Sell Now"}
                        </span>
                      ) : !alert.active ? (
                        <span className="text-[10px] text-text-muted">
                          Paused
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted">
                          Watching
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className="text-xs text-text-muted hover:text-text-primary transition-colors p-1"
                        title={alert.active ? "Pause" : "Resume"}
                      >
                        {alert.active ? "||" : "\u25B6"}
                      </button>
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="text-sm text-text-muted hover:text-loss transition-colors p-1"
                        title="Delete"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </ErrorBoundary>

      {showCreator && (
        <AlertCreator
          onAdd={addAlert}
          onClose={() => setShowCreator(false)}
        />
      )}

      {selectedInstrument && (
        <InstrumentDetailPanel
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      )}
    </AppShell>
  );
}

function AlertsSkeleton() {
  return (
    <div className="bg-surface-1 border border-border rounded-lg overflow-hidden animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 border-b border-border/50 bg-surface-2/20" />
      ))}
    </div>
  );
}
