"use client";

import { useMemo } from "react";
import type { InsiderTrade } from "@/lib/alert-types";
import { useInsiderTrades } from "@/hooks/use-insider-trades";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

interface InsiderTradesPanelProps {
  symbol: string;
}

export function InsiderTradesPanel({ symbol }: InsiderTradesPanelProps) {
  const { data: trades = [], isLoading, isError, refetch } = useInsiderTrades(symbol);

  const summary = useMemo(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentTrades = trades.filter(
      (t) => new Date(t.transactionDate) >= ninetyDaysAgo
    );

    const buys = recentTrades.filter((t) => t.transactionType === "BUY").length;
    const sells = recentTrades.filter(
      (t) => t.transactionType === "SELL"
    ).length;

    return { buys, sells, total: recentTrades.length };
  }, [trades]);

  if (isLoading) return <InsiderTradesSkeleton />;
  if (isError)
    return (
      <ErrorState message="Failed to load insider trades" onRetry={refetch} />
    );
  if (trades.length === 0)
    return <EmptyState message="No insider trading data available" />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-surface-2 rounded-lg px-4 py-3">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
          Net insider activity (last 90 days)
        </div>
        <div className="flex items-center gap-4 text-sm">
          {summary.total === 0 ? (
            <span className="text-text-muted">No recent activity</span>
          ) : (
            <>
              <span className="text-gain font-medium">
                {summary.buys} {summary.buys === 1 ? "buy" : "buys"}
              </span>
              <span className="text-text-muted">&middot;</span>
              <span className="text-loss font-medium">
                {summary.sells} {summary.sells === 1 ? "sell" : "sells"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Trades table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="text-left px-2 py-2 font-medium">Date</th>
              <th className="text-left px-2 py-2 font-medium">Insider</th>
              <th className="text-center px-2 py-2 font-medium">Type</th>
              <th className="text-right px-2 py-2 font-medium">Shares</th>
              <th className="text-right px-2 py-2 font-medium">Price</th>
              <th className="text-right px-2 py-2 font-medium">Value</th>
              <th className="text-center px-2 py-2 font-medium">Filing</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, idx) => (
              <tr
                key={`${trade.filingDate}-${trade.insiderName}-${idx}`}
                className="border-b border-border/30 hover:bg-surface-2/50 transition-colors"
              >
                <td className="px-2 py-2 text-text-secondary tabular-nums whitespace-nowrap">
                  {trade.transactionDate}
                </td>
                <td className="px-2 py-2">
                  <div className="text-text-primary truncate max-w-[120px]">
                    {trade.insiderName}
                  </div>
                  <div className="text-[10px] text-text-muted truncate max-w-[120px]">
                    {trade.insiderTitle}
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <TradeTypeBadge type={trade.transactionType} />
                </td>
                <td className="px-2 py-2 text-right text-text-primary tabular-nums">
                  {formatNumber(trade.shares)}
                </td>
                <td className="px-2 py-2 text-right text-text-secondary tabular-nums">
                  {trade.pricePerShare != null
                    ? formatCurrency(trade.pricePerShare)
                    : "--"}
                </td>
                <td
                  className={cn(
                    "px-2 py-2 text-right tabular-nums font-medium",
                    trade.totalValue != null &&
                      Math.abs(trade.totalValue) >= 1_000_000
                      ? "text-text-primary"
                      : "text-text-secondary"
                  )}
                >
                  {trade.totalValue != null
                    ? formatCurrency(trade.totalValue, "USD", true)
                    : "--"}
                </td>
                <td className="px-2 py-2 text-center">
                  <a
                    href={trade.secFilingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover transition-colors"
                    title="View SEC Filing"
                  >
                    SEC
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TradeTypeBadge({
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

function InsiderTradesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Summary skeleton */}
      <div className="bg-surface-2 rounded-lg px-4 py-3">
        <div className="h-2.5 w-40 bg-surface-3 rounded mb-2" />
        <div className="flex gap-4">
          <div className="h-4 w-14 bg-surface-3 rounded" />
          <div className="h-4 w-14 bg-surface-3 rounded" />
        </div>
      </div>

      {/* Table skeleton */}
      <div>
        <div className="flex items-center gap-3 px-2 py-2 border-b border-border">
          {[48, 80, 40, 50, 50, 60, 28].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-surface-3 rounded"
              style={{ width: w }}
            />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-2 py-3 border-b border-border/30"
          >
            <div className="h-3 w-16 bg-surface-3 rounded" />
            <div className="flex-1">
              <div className="h-3 w-20 bg-surface-3 rounded mb-1" />
              <div className="h-2 w-14 bg-surface-3 rounded" />
            </div>
            <div className="h-4 w-10 bg-surface-3 rounded" />
            <div className="h-3 w-12 bg-surface-3 rounded" />
            <div className="h-3 w-14 bg-surface-3 rounded" />
            <div className="h-3 w-16 bg-surface-3 rounded" />
            <div className="h-3 w-7 bg-surface-3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
