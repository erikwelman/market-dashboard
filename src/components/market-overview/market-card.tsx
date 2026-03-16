"use client";

import { useState } from "react";
import type { Instrument, Quote, TimeRange } from "@/lib/market-data/types";
import { useChartData } from "@/hooks/use-chart-data";
import { PriceChart } from "@/components/charts/price-chart";
import { RangeSelector } from "./range-selector";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { formatCurrency, formatPercent, computeRangeChange, cn } from "@/lib/utils";

interface MarketCardProps {
  instrument: Instrument;
  quote?: Quote;
  loading?: boolean;
}

export function MarketCard({ instrument, quote, loading }: MarketCardProps) {
  const [range, setRange] = useState<TimeRange>("1M");
  const { data: chartData } = useChartData(instrument.providerSymbol, range);

  if (loading || !quote) return <SkeletonCard />;

  const { change, changePercent } = computeRangeChange(chartData, quote, range);
  const positive = changePercent >= 0;

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4 hover:border-border-hover transition-colors">
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-medium">
              {instrument.symbol}
            </span>
            {quote.marketState && quote.marketState !== "REGULAR" && (
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  quote.marketState === "CLOSED"
                    ? "text-text-muted bg-surface-3"
                    : "text-accent bg-accent/10"
                )}
              >
                {quote.marketState === "PRE" || quote.marketState === "PREPRE"
                  ? "Pre"
                  : quote.marketState === "POST" || quote.marketState === "POSTPOST"
                    ? "After Hrs"
                    : quote.marketState === "CLOSED"
                      ? "Closed"
                      : quote.marketState}
              </span>
            )}
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
          {formatPercent(changePercent)}
        </div>
      </div>
      <div className="text-xs text-text-muted mb-3">
        {positive ? "+" : ""}
        {formatCurrency(change, quote.currency)}
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
