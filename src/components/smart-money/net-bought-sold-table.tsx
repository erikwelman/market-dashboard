"use client";

import type { StockConsensus } from "@/lib/investor-data/types";
import { cn } from "@/lib/utils";

interface NetBoughtSoldTableProps {
  title: string;
  subtitle?: string;
  stocks: StockConsensus[];
  direction: "bought" | "sold" | "neutral";
}

export function NetBoughtSoldTable({
  title,
  subtitle,
  stocks,
  direction,
}: NetBoughtSoldTableProps) {
  if (stocks.length === 0) {
    return (
      <div>
        <h3
          className={cn(
            "text-xs font-semibold mb-2",
            direction === "bought"
              ? "text-gain"
              : direction === "sold"
                ? "text-loss"
                : "text-text-primary"
          )}
        >
          {title}
        </h3>
        <div className="text-xs text-text-muted py-4 text-center bg-surface-2 rounded">
          No consensus {direction === "bought" ? "buying" : direction === "sold" ? "selling" : "activity"} trends detected
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3
        className={cn(
          "text-xs font-semibold mb-1",
          direction === "bought"
            ? "text-gain"
            : direction === "sold"
              ? "text-loss"
              : "text-text-primary"
        )}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="text-[10px] text-text-muted mb-2">{subtitle}</p>
      )}
      <div className="border border-border rounded overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider border-b border-border bg-surface-2">
          <div className="flex-1">Company</div>
          <div className="w-[50px] text-center">Score</div>
          <div className="w-[140px] text-center hidden sm:block">
            Breakdown
          </div>
        </div>
        {/* Rows */}
        {stocks.map((stock, idx) => (
          <div
            key={stock.cusip}
            className="flex items-center gap-2 px-3 py-2 text-xs border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors"
          >
            {/* Rank + Company */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-text-muted text-[10px] w-4 shrink-0">
                {idx + 1}.
              </span>
              <span className="text-text-primary truncate">
                {stock.companyName}
              </span>
            </div>

            {/* Net score */}
            <div className="w-[50px] text-center">
              <span
                className={cn(
                  "font-semibold tabular-nums px-1.5 py-0.5 rounded text-xs",
                  stock.netScore > 0
                    ? "text-gain bg-gain-bg"
                    : stock.netScore < 0
                      ? "text-loss bg-loss-bg"
                      : "text-text-muted bg-surface-3"
                )}
              >
                {stock.netScore > 0 ? "+" : ""}
                {stock.netScore}
              </span>
            </div>

            {/* Breakdown */}
            <div className="w-[140px] hidden sm:flex items-center justify-center gap-1.5">
              {stock.investorsNew > 0 && (
                <MiniTag label="New" count={stock.investorsNew} color="accent" />
              )}
              {stock.investorsAdded > 0 && (
                <MiniTag
                  label="Add"
                  count={stock.investorsAdded}
                  color="gain"
                />
              )}
              {stock.investorsReduced > 0 && (
                <MiniTag
                  label="Cut"
                  count={stock.investorsReduced}
                  color="loss"
                />
              )}
              {stock.investorsExited > 0 && (
                <MiniTag
                  label="Exit"
                  count={stock.investorsExited}
                  color="loss"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTag({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "gain" | "loss" | "accent";
}) {
  const colors = {
    gain: "text-gain",
    loss: "text-loss",
    accent: "text-accent",
  };
  return (
    <span className="text-[10px] text-text-muted whitespace-nowrap">
      {label}:{" "}
      <span className={cn("font-medium", colors[color])}>{count}</span>
    </span>
  );
}
