"use client";

import { useState, useEffect } from "react";
import type { Instrument, TimeRange } from "@/lib/market-data/types";
import { useQuotes } from "@/hooks/use-quotes";
import { useChartData } from "@/hooks/use-chart-data";
import { PriceChart } from "@/components/charts/price-chart";
import { RangeSelector } from "@/components/market-overview/range-selector";
import { formatCurrency, formatPercent, formatVolume, computeRangeChange, cn } from "@/lib/utils";

interface InstrumentDetailPanelProps {
  instrument: Instrument;
  onClose: () => void;
}

export function InstrumentDetailPanel({
  instrument,
  onClose,
}: InstrumentDetailPanelProps) {
  const [range, setRange] = useState<TimeRange>("1M");
  const { data: quotes } = useQuotes([instrument.providerSymbol]);
  const { data: chartData } = useChartData(instrument.providerSymbol, range);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const quote = quotes?.[0];
  const { change, changePercent } = computeRangeChange(chartData, quote, range);
  const positive = changePercent >= 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-surface-1 border-l border-border z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">{instrument.symbol}</h2>
              <p className="text-sm text-text-secondary">{instrument.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-xl transition-colors"
            >
              ×
            </button>
          </div>

          {/* Price */}
          {quote && (
            <div className="mb-6">
              <div className="text-2xl font-semibold tabular-nums mb-1">
                {formatCurrency(quote.price, quote.currency)}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium px-2 py-0.5 rounded",
                    positive ? "text-gain bg-gain-bg" : "text-loss bg-loss-bg"
                  )}
                >
                  {formatPercent(changePercent)}
                </span>
                <span className="text-sm text-text-secondary">
                  {positive ? "+" : ""}
                  {formatCurrency(change, quote.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="mb-4">
            <PriceChart
              data={chartData || []}
              height={280}
              positive={positive}
            />
          </div>
          <div className="mb-6">
            <RangeSelector selected={range} onSelect={setRange} />
          </div>

          {/* Stats */}
          {quote && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Exchange" value={quote.exchange} />
              <Stat label="Currency" value={quote.currency} />
              {quote.volume != null && (
                <Stat label="Volume" value={formatVolume(quote.volume)} />
              )}
              {quote.marketState && (
                <Stat label="Market State" value={quote.marketState} />
              )}
              {quote.fiftyTwoWeekHigh != null &&
                quote.fiftyTwoWeekLow != null && (
                  <div className="col-span-2">
                    <FiftyTwoWeekRange
                      low={quote.fiftyTwoWeekLow}
                      high={quote.fiftyTwoWeekHigh}
                      current={quote.price}
                      currency={quote.currency}
                    />
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 rounded px-3 py-2">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function FiftyTwoWeekRange({
  low,
  high,
  current,
  currency,
}: {
  low: number;
  high: number;
  current: number;
  currency: string;
}) {
  const range = high - low;
  const pct = range > 0 ? Math.min(Math.max(((current - low) / range) * 100, 0), 100) : 50;

  return (
    <div className="bg-surface-2 rounded px-3 py-2">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
        52-Week Range
      </div>
      <div className="flex items-center gap-2 text-xs tabular-nums">
        <span className="text-text-secondary shrink-0">
          {formatCurrency(low, currency)}
        </span>
        <div className="flex-1 relative h-1.5 bg-surface-3 rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-accent border-2 border-surface-1"
            style={{ left: `${pct}%`, marginLeft: "-6px" }}
          />
        </div>
        <span className="text-text-secondary shrink-0">
          {formatCurrency(high, currency)}
        </span>
      </div>
      <div className="text-[10px] text-text-muted mt-1 text-center">
        {pct.toFixed(0)}% of range
      </div>
    </div>
  );
}
