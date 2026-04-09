"use client";

import { useState, useMemo } from "react";
import type { Instrument } from "@/lib/market-data/types";
import type { InsiderTrade } from "@/lib/alert-types";
import { useInsiderTrades } from "@/hooks/use-insider-trades";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";

type TradeFilter = "all" | "buys" | "sells" | "large";

interface InsiderFeedProps {
  symbols: string[];
  onSelectInstrument: (instrument: Instrument) => void;
  instruments: Instrument[];
}

export function InsiderFeed({
  symbols,
  onSelectInstrument,
  instruments,
}: InsiderFeedProps) {
  const [filter, setFilter] = useState<TradeFilter>("all");

  const {
    data: trades = [],
    isLoading,
    isError,
    refetch,
  } = useInsiderTrades(undefined, { symbols, limit: 100 });

  const filteredTrades = useMemo(() => {
    switch (filter) {
      case "buys":
        return trades.filter((t) => t.transactionType === "BUY");
      case "sells":
        return trades.filter((t) => t.transactionType === "SELL");
      case "large":
        return trades.filter(
          (t) => t.totalValue != null && Math.abs(t.totalValue) >= 1_000_000
        );
      default:
        return trades;
    }
  }, [trades, filter]);

  const handleRowClick = (trade: InsiderTrade) => {
    const instrument = instruments.find(
      (i) =>
        i.symbol.toUpperCase() === trade.symbol.toUpperCase() ||
        i.providerSymbol.toUpperCase() === trade.symbol.toUpperCase()
    );
    if (instrument) {
      onSelectInstrument(instrument);
    } else {
      onSelectInstrument({
        symbol: trade.symbol,
        providerSymbol: trade.symbol,
        name: trade.companyName,
        type: "equity",
      });
    }
  };

  const filters: { key: TradeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "buys", label: "Buys Only" },
    { key: "sells", label: "Sells Only" },
    { key: "large", label: ">$1M" },
  ];

  return (
    <div className="bg-surface-1 border border-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-text-primary">
          Insider Activity
        </h3>
        <span className="text-xs text-text-muted">
          {filteredTrades.length} trades
        </span>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-1 px-4 pb-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-2.5 py-1 text-xs rounded font-medium transition-colors",
              filter === f.key
                ? "bg-accent/15 text-accent"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <InsiderFeedSkeleton />
      ) : isError ? (
        <ErrorState
          message="Failed to load insider trades"
          onRetry={refetch}
        />
      ) : filteredTrades.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-text-muted text-sm">
          {symbols.length === 0
            ? "Add symbols to your watchlist to see insider activity"
            : "No insider trades found"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-2 py-2 font-medium">Symbol</th>
                <th className="text-left px-2 py-2 font-medium">Insider</th>
                <th className="text-left px-2 py-2 font-medium hidden lg:table-cell">
                  Title
                </th>
                <th className="text-center px-2 py-2 font-medium">Type</th>
                <th className="text-right px-2 py-2 font-medium">Shares</th>
                <th className="text-right px-2 py-2 font-medium hidden md:table-cell">
                  Price
                </th>
                <th className="text-right px-2 py-2 font-medium">Value</th>
                <th className="text-center px-4 py-2 font-medium hidden sm:table-cell">
                  Filing
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade, idx) => {
                const isLarge =
                  trade.totalValue != null &&
                  Math.abs(trade.totalValue) >= 1_000_000;

                return (
                  <tr
                    key={`${trade.filingDate}-${trade.insiderName}-${idx}`}
                    onClick={() => handleRowClick(trade)}
                    className={cn(
                      "border-b border-border/30 hover:bg-surface-2/50 cursor-pointer transition-colors",
                      isLarge && "bg-surface-2/20"
                    )}
                  >
                    <td className="px-4 py-2 text-text-secondary tabular-nums whitespace-nowrap">
                      {trade.transactionDate}
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-semibold text-accent">
                        {trade.symbol}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-text-primary max-w-[140px] truncate">
                      {trade.insiderName}
                    </td>
                    <td className="px-2 py-2 text-text-muted max-w-[120px] truncate hidden lg:table-cell">
                      {trade.insiderTitle}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <TransactionTypeBadge type={trade.transactionType} />
                    </td>
                    <td className="px-2 py-2 text-right text-text-primary tabular-nums">
                      {formatNumber(trade.shares)}
                    </td>
                    <td className="px-2 py-2 text-right text-text-secondary tabular-nums hidden md:table-cell">
                      {trade.pricePerShare != null
                        ? formatCurrency(trade.pricePerShare)
                        : "--"}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-right tabular-nums font-medium",
                        isLarge ? "text-text-primary" : "text-text-secondary"
                      )}
                    >
                      {trade.totalValue != null
                        ? formatCurrency(trade.totalValue, "USD", true)
                        : "--"}
                    </td>
                    <td className="px-4 py-2 text-center hidden sm:table-cell">
                      <a
                        href={trade.secFilingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent hover:text-accent-hover transition-colors"
                        title="View SEC Filing"
                      >
                        SEC
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TransactionTypeBadge({
  type,
}: {
  type: InsiderTrade["transactionType"];
}) {
  const config: Record<
    InsiderTrade["transactionType"],
    { label: string; className: string }
  > = {
    BUY: { label: "Buy", className: "text-gain bg-gain-bg" },
    SELL: { label: "Sell", className: "text-loss bg-loss-bg" },
    OPTION_EXERCISE: {
      label: "Option",
      className: "text-text-muted bg-surface-3",
    },
    GIFT: { label: "Gift", className: "text-text-muted bg-surface-3" },
    OTHER: { label: "Other", className: "text-text-muted bg-surface-3" },
  };

  const { label, className } = config[type];
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase inline-block",
        className
      )}
    >
      {label}
    </span>
  );
}

function InsiderFeedSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
        {[48, 40, 100, 80, 40, 60, 60, 60, 28].map((w, i) => (
          <div
            key={i}
            className="h-3 bg-surface-3 rounded"
            style={{ width: w }}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border/30"
        >
          <div className="h-3 w-16 bg-surface-3 rounded" />
          <div className="h-3 w-10 bg-surface-3 rounded" />
          <div className="h-3 w-24 bg-surface-3 rounded" />
          <div className="h-3 w-16 bg-surface-3 rounded" />
          <div className="h-4 w-10 bg-surface-3 rounded" />
          <div className="h-3 w-14 bg-surface-3 rounded" />
          <div className="h-3 w-14 bg-surface-3 rounded" />
          <div className="h-3 w-16 bg-surface-3 rounded" />
          <div className="h-3 w-7 bg-surface-3 rounded" />
        </div>
      ))}
    </div>
  );
}
