"use client";

import { useState } from "react";
import type { Instrument, Quote, TimeRange } from "@/lib/market-data/types";
import { useChartData } from "@/hooks/use-chart-data";
import { PriceChart } from "@/components/charts/price-chart";
import { RangeSelector } from "./range-selector";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface MarketCardProps {
  instrument: Instrument;
  quote?: Quote;
  loading?: boolean;
}

export function MarketCard({ instrument, quote, loading }: MarketCardProps) {
  const [range, setRange] = useState<TimeRange>("1M");
  const { data: chartData } = useChartData(instrument.providerSymbol, range);

  if (loading || !quote) return <SkeletonCard />;

  const positive = quote.changePercent >= 0;

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4 hover:border-border-hover transition-colors">
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="text-xs text-text-secondary font-medium">
            {instrument.symbol}
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {formatCurrency(quote.price, quote.currency)}
          </div>
        </div>
        <div
          className={cn(
            "text-sm font-medium px-2 py-0.5 rounded",
            positive ? "text-gain bg-gain-bg" : "text-loss bg-loss-bg"
          )}
        >
          {formatPercent(quote.changePercent)}
        </div>
      </div>
      <div className="text-xs text-text-muted mb-3">
        {positive ? "+" : ""}
        {formatCurrency(quote.change, quote.currency)}
      </div>
      <div className="mb-2">
        <PriceChart
          data={chartData || []}
          height={200}
          positive={positive}
        />
      </div>
      <RangeSelector selected={range} onSelect={setRange} compact />
    </div>
  );
}
