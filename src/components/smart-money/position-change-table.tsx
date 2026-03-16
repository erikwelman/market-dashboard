"use client";

import type {
  PositionChange,
  PositionChangeType,
} from "@/lib/investor-data/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface PositionChangeTableProps {
  changes: PositionChange[];
  filter?: PositionChangeType | "BUYS" | "SELLS";
  quarterLabel: string;
}

const CHANGE_LABELS: Record<PositionChangeType, string> = {
  NEW: "Buy",
  ADDED: "Add",
  REDUCED: "Reduce",
  EXITED: "Sell",
  UNCHANGED: "—",
};

const CHANGE_COLORS: Record<PositionChangeType, string> = {
  NEW: "text-accent bg-accent/10",
  ADDED: "text-gain bg-gain-bg",
  REDUCED: "text-loss bg-loss-bg",
  EXITED: "text-loss bg-loss-bg",
  UNCHANGED: "text-text-muted bg-surface-3",
};

export function PositionChangeTable({
  changes,
  filter,
  quarterLabel,
}: PositionChangeTableProps) {
  let filtered = changes.filter((c) => c.changeType !== "UNCHANGED");

  if (filter === "BUYS") {
    filtered = filtered.filter(
      (c) => c.changeType === "NEW" || c.changeType === "ADDED"
    );
  } else if (filter === "SELLS") {
    filtered = filtered.filter(
      (c) => c.changeType === "REDUCED" || c.changeType === "EXITED"
    );
  } else if (filter) {
    const f = filter as PositionChangeType;
    filtered = filtered.filter((c) => c.changeType === f);
  }

  const sorted = [...filtered].sort(
    (a, b) => Math.abs(b.valueChange) - Math.abs(a.valueChange)
  );

  const title =
    filter === "BUYS"
      ? "Buys"
      : filter === "SELLS"
        ? "Sells"
        : "All Activity";

  if (sorted.length === 0) {
    return (
      <div>
        <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
          {quarterLabel} {title}
        </h4>
        <div className="text-xs text-text-muted py-6 text-center bg-surface-2 rounded">
          No {title.toLowerCase()} this quarter
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
        {quarterLabel} {title} ({sorted.length})
      </h4>
      <div className="border border-border rounded overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-text-muted uppercase tracking-wider border-b border-border bg-surface-2">
          <div className="w-[50px]">Type</div>
          <div className="flex-1">Stock</div>
          <div className="w-[80px] text-right">Shares</div>
          <div className="w-[80px] text-right">Δ Shares</div>
          <div className="w-[55px] text-right">Δ %</div>
          <div className="w-[80px] text-right">Value</div>
        </div>
        {/* Rows */}
        <div className="max-h-[500px] overflow-y-auto">
          {sorted.map((change) => (
            <div
              key={change.cusip}
              className="flex items-center gap-2 px-3 py-2 text-xs border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors"
            >
              {/* Activity type */}
              <div className="w-[50px]">
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    CHANGE_COLORS[change.changeType]
                  )}
                >
                  {CHANGE_LABELS[change.changeType]}
                </span>
              </div>
              {/* Company */}
              <div className="flex-1 min-w-0">
                <div className="text-text-primary truncate">
                  {change.nameOfIssuer}
                </div>
              </div>
              {/* Current shares */}
              <div className="w-[80px] text-right text-text-secondary tabular-nums">
                {change.currentShares > 0
                  ? formatNumber(change.currentShares)
                  : "—"}
              </div>
              {/* Share change */}
              <div
                className={cn(
                  "w-[80px] text-right tabular-nums",
                  change.sharesChange > 0
                    ? "text-gain"
                    : change.sharesChange < 0
                      ? "text-loss"
                      : "text-text-muted"
                )}
              >
                {change.sharesChange > 0 ? "+" : ""}
                {change.sharesChange !== 0
                  ? formatNumber(change.sharesChange)
                  : "—"}
              </div>
              {/* % change */}
              <div
                className={cn(
                  "w-[55px] text-right tabular-nums",
                  change.sharesChangePercent > 0
                    ? "text-gain"
                    : change.sharesChangePercent < 0
                      ? "text-loss"
                      : "text-text-muted"
                )}
              >
                {change.changeType === "NEW"
                  ? "New"
                  : change.changeType === "EXITED"
                    ? "100%"
                    : `${Math.abs(change.sharesChangePercent).toFixed(1)}%`}
              </div>
              {/* Value */}
              <div className="w-[80px] text-right text-text-primary tabular-nums">
                {change.currentValue > 0
                  ? formatCurrency(change.currentValue , "USD", true)
                  : formatCurrency(
                      change.previousValue ,
                      "USD",
                      true
                    )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
