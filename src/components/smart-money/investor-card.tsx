"use client";

import type { TrackedInvestor } from "@/lib/investor-data/types";
import { useLatestFiling } from "@/hooks/use-investor-filing";
import {
  reportDateToQuarter,
  formatFilingDate,
} from "@/lib/investor-data/quarters";
import { cn, formatCurrency } from "@/lib/utils";

interface InvestorCardProps {
  investor: TrackedInvestor;
  onSelect: () => void;
  onRemove: () => void;
}

export function InvestorCard({
  investor,
  onSelect,
  onRemove,
}: InvestorCardProps) {
  const { data: filing, isLoading } = useLatestFiling(investor.cik);

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2 cursor-pointer transition-colors border-b border-border last:border-b-0 group"
    >
      {/* Name + quarter + filing date */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">
          {investor.name}
        </div>
        {isLoading ? (
          <div className="h-3 w-24 bg-surface-3 rounded animate-pulse mt-1" />
        ) : filing ? (
          <div className="text-xs text-text-secondary">
            <span className="text-accent font-medium">
              {reportDateToQuarter(filing.reportDate)}
            </span>
            <span className="text-text-muted ml-1.5">
              Filed {formatFilingDate(filing.filingDate)}
            </span>
          </div>
        ) : (
          <div className="text-xs text-text-muted">No 13F data</div>
        )}
      </div>

      {/* Net direction badge */}
      <div className="min-w-[70px] text-right">
        {filing && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
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
                : "Hold"}
          </span>
        )}
      </div>

      {/* Position counts */}
      <div className="hidden md:flex items-center gap-2 min-w-[200px]">
        {filing && (
          <>
            <CountBadge label="Buy" count={filing.newPositions} color="accent" />
            <CountBadge
              label="Add"
              count={filing.increasedPositions}
              color="gain"
            />
            <CountBadge
              label="Reduce"
              count={filing.reducedPositions}
              color="loss"
            />
            <CountBadge
              label="Sell"
              count={filing.exitedPositions}
              color="loss"
            />
          </>
        )}
      </div>

      {/* Total AUM */}
      <div className="hidden lg:block min-w-[90px] text-right">
        {filing && (
          <div className="text-xs text-text-secondary tabular-nums">
            {formatCurrency(filing.totalValue, "USD", true)}
          </div>
        )}
      </div>

      {/* Remove */}
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

function CountBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "gain" | "loss" | "accent";
}) {
  if (count === 0) return null;
  const colorMap = {
    gain: "text-gain",
    loss: "text-loss",
    accent: "text-accent",
  };
  return (
    <span className="text-[10px] text-text-muted">
      {label}{" "}
      <span className={cn("font-medium", colorMap[color])}>{count}</span>
    </span>
  );
}
