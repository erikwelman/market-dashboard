"use client";

import type {
  PositionChange,
  PositionChangeType,
  DatedPositionChange,
} from "@/lib/investor-data/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface PositionChangeTableProps {
  changes: (PositionChange | DatedPositionChange)[];
  filter?: PositionChangeType | "BUYS" | "SELLS";
  quarterLabel?: string;
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

function isDated(c: PositionChange | DatedPositionChange): c is DatedPositionChange {
  return "quarter" in c;
}

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

  // If items have dates, they're already sorted newest-first from the hook.
  // Otherwise sort by absolute value change.
  const sorted = filtered.length > 0 && isDated(filtered[0])
    ? filtered
    : [...filtered].sort(
        (a, b) => Math.abs(b.valueChange) - Math.abs(a.valueChange)
      );

  const hasDates = sorted.length > 0 && isDated(sorted[0]);

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
          {quarterLabel ? `${quarterLabel} ` : ""}{title}
        </h4>
        <div className="text-xs text-text-muted py-6 text-center bg-surface-2 rounded">
          No {title.toLowerCase()} to show
        </div>
      </div>
    );
  }

  // Group by quarter for section headers when showing dated changes
  let currentQuarter = "";

  return (
    <div>
      <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
        {quarterLabel ? `${quarterLabel} ` : ""}{title} ({sorted.length})
      </h4>
      <div className="border border-border rounded overflow-hidden">
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-[10px] text-text-muted uppercase tracking-wider border-b border-border bg-surface-2",
            hasDates ? "grid grid-cols-[70px_50px_1fr_80px_80px_55px_80px]" : "flex"
          )}
        >
          {hasDates && <div>Quarter</div>}
          <div className={hasDates ? "" : "w-[50px]"}>Type</div>
          <div className={hasDates ? "" : "flex-1"}>Stock</div>
          <div className={hasDates ? "text-right" : "w-[80px] text-right"}>Shares</div>
          <div className={hasDates ? "text-right" : "w-[80px] text-right"}>Δ Shares</div>
          <div className={hasDates ? "text-right" : "w-[55px] text-right"}>Δ %</div>
          <div className={hasDates ? "text-right" : "w-[80px] text-right"}>Value</div>
        </div>
        {/* Rows */}
        <div className="max-h-[500px] overflow-y-auto">
          {sorted.map((change, idx) => {
            const dated = isDated(change) ? change : null;
            const showQuarterDivider = dated && dated.quarter !== currentQuarter;
            if (dated) currentQuarter = dated.quarter;

            return (
              <div key={dated ? `${dated.quarter}-${change.cusip}-${idx}` : change.cusip}>
                {/* Quarter group divider */}
                {showQuarterDivider && (
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-accent bg-accent/5 border-b border-border">
                    {dated!.quarter}
                  </div>
                )}
                <div
                  className={cn(
                    "px-3 py-2 text-xs border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors",
                    hasDates
                      ? "grid grid-cols-[70px_50px_1fr_80px_80px_55px_80px] items-center gap-2"
                      : "flex items-center gap-2"
                  )}
                >
                  {/* Quarter */}
                  {hasDates && (
                    <div className="text-[10px] text-text-muted tabular-nums">
                      {dated?.quarter}
                    </div>
                  )}
                  {/* Activity type */}
                  <div className={hasDates ? "" : "w-[50px]"}>
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
                  <div className={cn("min-w-0", hasDates ? "" : "flex-1")}>
                    <div className="text-text-primary truncate">
                      {change.nameOfIssuer}
                    </div>
                  </div>
                  {/* Current shares */}
                  <div className={cn("text-right text-text-secondary tabular-nums", hasDates ? "" : "w-[80px]")}>
                    {change.currentShares > 0
                      ? formatNumber(change.currentShares)
                      : "—"}
                  </div>
                  {/* Share change */}
                  <div
                    className={cn(
                      "text-right tabular-nums",
                      hasDates ? "" : "w-[80px]",
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
                      "text-right tabular-nums",
                      hasDates ? "" : "w-[55px]",
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
                  <div className={cn("text-right text-text-primary tabular-nums", hasDates ? "" : "w-[80px]")}>
                    {change.currentValue > 0
                      ? formatCurrency(change.currentValue, "USD", true)
                      : formatCurrency(
                          change.previousValue,
                          "USD",
                          true
                        )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
