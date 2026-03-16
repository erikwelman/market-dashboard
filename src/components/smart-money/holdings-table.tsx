"use client";

import type { Holding, PositionChange } from "@/lib/investor-data/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface HoldingsTableProps {
  holdings: Holding[];
  changes?: PositionChange[];
  quarterLabel: string;
}

const ACTIVITY_LABELS: Record<string, string> = {
  NEW: "Buy",
  ADDED: "Add",
  REDUCED: "Reduce",
  EXITED: "Sell",
};

const ACTIVITY_COLORS: Record<string, string> = {
  NEW: "text-accent",
  ADDED: "text-gain",
  REDUCED: "text-loss",
  EXITED: "text-loss",
};

export function HoldingsTable({
  holdings,
  changes,
  quarterLabel,
}: HoldingsTableProps) {
  const sorted = [...holdings].sort((a, b) => b.value - a.value);
  const changeMap = new Map(changes?.map((c) => [c.cusip, c]));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] text-text-muted uppercase tracking-wider">
          {quarterLabel} Holdings ({holdings.length} positions)
        </h4>
      </div>
      <div className="border border-border rounded overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-text-muted uppercase tracking-wider border-b border-border bg-surface-2">
          <div className="w-[45px] text-right">%</div>
          <div className="flex-1">Stock</div>
          <div className="w-[70px] text-center">Activity</div>
          <div className="w-[80px] text-right">Shares</div>
          <div className="w-[90px] text-right">Value</div>
        </div>
        {/* Rows */}
        <div className="max-h-[500px] overflow-y-auto">
          {sorted.map((holding) => {
            const change = changeMap.get(holding.cusip);
            return (
              <div
                key={holding.cusip}
                className="flex items-center gap-2 px-3 py-2 text-xs border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors"
              >
                {/* Portfolio weight */}
                <div className="w-[45px] text-right text-text-secondary tabular-nums">
                  {holding.portfolioWeight != null
                    ? `${holding.portfolioWeight.toFixed(1)}%`
                    : "—"}
                </div>
                {/* Company */}
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary truncate">
                    {holding.nameOfIssuer}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {holding.titleOfClass}
                  </div>
                </div>
                {/* Activity badge */}
                <div className="w-[70px] text-center">
                  {change && change.changeType !== "UNCHANGED" ? (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        ACTIVITY_COLORS[change.changeType]
                      )}
                    >
                      {ACTIVITY_LABELS[change.changeType]}
                      {change.changeType === "ADDED" ||
                      change.changeType === "REDUCED"
                        ? ` ${Math.abs(change.sharesChangePercent).toFixed(0)}%`
                        : ""}
                    </span>
                  ) : null}
                </div>
                {/* Shares */}
                <div className="w-[80px] text-right text-text-secondary tabular-nums">
                  {formatNumber(holding.shares)}
                </div>
                {/* Value */}
                <div className="w-[90px] text-right text-text-primary tabular-nums">
                  {formatCurrency(holding.value, "USD", true)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
