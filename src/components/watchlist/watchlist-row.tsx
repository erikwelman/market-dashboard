"use client";

import type { Instrument, Quote } from "@/lib/market-data/types";
import { useChartData } from "@/hooks/use-chart-data";
import { SparklineChart } from "@/components/charts/sparkline-chart";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface WatchlistRowProps {
  instrument: Instrument;
  quote?: Quote;
  onSelect: () => void;
  onRemove: () => void;
}

export function WatchlistRow({ instrument, quote, onSelect, onRemove }: WatchlistRowProps) {
  const { data: chartData } = useChartData(instrument.providerSymbol, "1M");
  const positive = (quote?.changePercent ?? 0) >= 0;

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2 cursor-pointer transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {instrument.symbol}
          </span>
          {instrument.exchange && (
            <span className="text-[10px] text-text-muted uppercase">
              {instrument.exchange}
            </span>
          )}
        </div>
        <div className="text-xs text-text-secondary truncate">
          {instrument.name}
        </div>
      </div>

      <div className="text-right min-w-[80px]">
        <div className="text-sm font-medium tabular-nums">
          {quote ? formatCurrency(quote.price, quote.currency) : "—"}
        </div>
      </div>

      <div className="min-w-[70px] text-right">
        {quote && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              positive ? "text-gain bg-gain-bg" : "text-loss bg-loss-bg"
            )}
          >
            {formatPercent(quote.changePercent)}
          </span>
        )}
      </div>

      <div className="hidden sm:block">
        <SparklineChart
          data={chartData || []}
          positive={positive}
        />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-loss transition-all text-sm px-1"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}
