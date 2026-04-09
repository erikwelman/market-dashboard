"use client";

import { useState, useEffect } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { useQuotes } from "@/hooks/use-quotes";
import { useWatchlistAlerts } from "@/hooks/use-watchlist-alerts";
import { WatchlistHeader } from "./watchlist-header";
import { WatchlistRow } from "./watchlist-row";
import { AlertCreator } from "@/components/alerts/alert-creator";
import { SkeletonRow } from "@/components/ui/skeleton-row";
import { EmptyState } from "@/components/ui/empty-state";

interface WatchlistPanelProps {
  instruments: Instrument[];
  onAddClick: () => void;
  onSelectInstrument: (instrument: Instrument) => void;
  onRemoveInstrument: (providerSymbol: string) => void;
}

export function WatchlistPanel({
  instruments,
  onAddClick,
  onSelectInstrument,
  onRemoveInstrument,
}: WatchlistPanelProps) {
  const symbols = instruments.map((i) => i.providerSymbol);
  const { data: quotes, isLoading } = useQuotes(symbols);
  const { addAlert, checkAlerts } = useWatchlistAlerts();
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);

  // Check alerts whenever quotes refresh
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      checkAlerts(quotes);
    }
  }, [quotes, checkAlerts]);

  const alertInstrument = alertSymbol
    ? instruments.find((i) => i.providerSymbol === alertSymbol)
    : null;

  return (
    <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
      <WatchlistHeader onAddClick={onAddClick} />
      {/* Column labels */}
      <div className="flex items-center gap-4 px-4 py-2 text-[10px] text-text-muted uppercase tracking-wider border-b border-border">
        <div className="flex-1">Symbol</div>
        <div className="min-w-[80px] text-right">Price</div>
        <div className="min-w-[70px] text-right">Change</div>
        <div className="hidden sm:block w-[120px]">1M</div>
        <div className="w-5" />
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
      ) : instruments.length === 0 ? (
        <EmptyState message="No instruments in watchlist" />
      ) : (
        instruments.map((instrument) => {
          const quote = quotes?.find(
            (q) => q.symbol === instrument.providerSymbol
          );
          return (
            <WatchlistRow
              key={instrument.providerSymbol}
              instrument={instrument}
              quote={quote}
              onSelect={() => onSelectInstrument(instrument)}
              onRemove={() => onRemoveInstrument(instrument.providerSymbol)}
              onAlert={() => setAlertSymbol(instrument.providerSymbol)}
            />
          );
        })
      )}

      {alertSymbol && alertInstrument && (
        <AlertCreator
          symbol={alertSymbol}
          currency={alertInstrument.currency}
          onAdd={addAlert}
          onClose={() => setAlertSymbol(null)}
        />
      )}
    </div>
  );
}
