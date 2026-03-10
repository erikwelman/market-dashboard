"use client";

import { MARKET_OVERVIEW_INSTRUMENTS } from "@/lib/instruments";
import { useQuotes } from "@/hooks/use-quotes";
import { MarketCard } from "./market-card";
import { ErrorState } from "@/components/ui/error-state";

export function MarketOverviewCards() {
  const symbols = MARKET_OVERVIEW_INSTRUMENTS.map((i) => i.providerSymbol);
  const { data: quotes, isLoading, isError, refetch } = useQuotes(symbols);

  if (isError) {
    return <ErrorState message="Failed to load market data" onRetry={() => refetch()} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {MARKET_OVERVIEW_INSTRUMENTS.map((instrument) => {
        const quote = quotes?.find((q) => q.symbol === instrument.providerSymbol);
        return (
          <MarketCard
            key={instrument.providerSymbol}
            instrument={instrument}
            quote={quote}
            loading={isLoading}
          />
        );
      })}
    </div>
  );
}
