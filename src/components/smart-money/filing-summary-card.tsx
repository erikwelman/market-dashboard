"use client";

import type { FilingSummary } from "@/lib/investor-data/types";
import { cn, formatCurrency } from "@/lib/utils";

interface FilingSummaryCardProps {
  filing: FilingSummary;
}

export function FilingSummaryCard({ filing }: FilingSummaryCardProps) {
  return (
    <div className="space-y-4">
      {/* Filing metadata */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Filing Date" value={filing.filingDate} />
        <Stat label="Report Period" value={filing.reportDate} />
        <Stat
          label="Total Positions"
          value={filing.totalPositions.toString()}
        />
        <Stat
          label="13F Value"
          value={formatCurrency(filing.totalValue , "USD", true)}
        />
      </div>

      {/* Net direction */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-sm font-medium px-2.5 py-1 rounded",
            filing.netDirection === "NET_BUY"
              ? "text-gain bg-gain-bg"
              : filing.netDirection === "NET_SELL"
                ? "text-loss bg-loss-bg"
                : "text-text-secondary bg-surface-3"
          )}
        >
          {filing.netDirection === "NET_BUY"
            ? "Net Buy"
            : filing.netDirection === "NET_SELL"
              ? "Net Sell"
              : "Hold / Largely Unchanged"}
        </span>
      </div>

      {/* Change counts */}
      <div className="grid grid-cols-5 gap-2">
        <ChangeCount
          label="New"
          count={filing.newPositions}
          color="text-accent"
        />
        <ChangeCount
          label="Added"
          count={filing.increasedPositions}
          color="text-gain"
        />
        <ChangeCount
          label="Reduced"
          count={filing.reducedPositions}
          color="text-loss"
        />
        <ChangeCount
          label="Exited"
          count={filing.exitedPositions}
          color="text-loss"
        />
        <ChangeCount
          label="Unchanged"
          count={filing.unchangedPositions}
          color="text-text-muted"
        />
      </div>

      {/* Top moves */}
      {filing.topMoves.length > 0 && (
        <div>
          <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
            Notable Moves
          </h4>
          <div className="space-y-1">
            {filing.topMoves.map((move) => (
              <div
                key={move.cusip}
                className="flex items-center justify-between py-1.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1 py-0.5 rounded shrink-0",
                      move.changeType === "NEW"
                        ? "text-accent bg-accent/10"
                        : move.changeType === "ADDED"
                          ? "text-gain bg-gain-bg"
                          : move.changeType === "REDUCED"
                            ? "text-loss bg-loss-bg"
                            : move.changeType === "EXITED"
                              ? "text-loss bg-loss-bg"
                              : "text-text-muted bg-surface-3"
                    )}
                  >
                    {move.changeType}
                  </span>
                  <span className="text-text-primary truncate">
                    {move.nameOfIssuer}
                  </span>
                </div>
                <span className="text-text-secondary tabular-nums shrink-0 ml-2">
                  {formatCurrency(move.currentValue , "USD", true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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

function ChangeCount({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={cn("text-lg font-semibold tabular-nums", color)}>
        {count}
      </div>
      <div className="text-[10px] text-text-muted uppercase">{label}</div>
    </div>
  );
}
