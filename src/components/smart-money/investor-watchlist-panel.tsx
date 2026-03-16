"use client";

import type { TrackedInvestor } from "@/lib/investor-data/types";
import { InvestorCard } from "./investor-card";
import { EmptyState } from "@/components/ui/empty-state";

interface InvestorWatchlistPanelProps {
  investors: TrackedInvestor[];
  onAddClick: () => void;
  onSelectInvestor: (investor: TrackedInvestor) => void;
  onRemoveInvestor: (cik: string) => void;
}

export function InvestorWatchlistPanel({
  investors,
  onAddClick,
  onSelectInvestor,
  onRemoveInvestor,
}: InvestorWatchlistPanelProps) {
  return (
    <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Smart Money
          </h2>
          <p className="text-[10px] text-text-muted mt-0.5">
            Based on latest disclosed 13F positions — not live trading
          </p>
        </div>
        <button
          onClick={onAddClick}
          className="text-xs text-accent hover:text-accent-hover font-medium transition-colors px-2 py-1 rounded hover:bg-surface-3"
        >
          + Add Investor
        </button>
      </div>

      {/* Column labels */}
      <div className="flex items-center gap-4 px-4 py-2 text-[10px] text-text-muted uppercase tracking-wider border-b border-border">
        <div className="flex-1">Investor / Fund</div>
        <div className="min-w-[70px] text-right">Direction</div>
        <div className="hidden md:block min-w-[200px]">Changes</div>
        <div className="hidden lg:block min-w-[90px] text-right">
          13F Value
        </div>
        <div className="w-5" />
      </div>

      {investors.length === 0 ? (
        <EmptyState message="No investors tracked — add funds to monitor their 13F activity" />
      ) : (
        investors.map((investor) => (
          <InvestorCard
            key={investor.cik}
            investor={investor}
            onSelect={() => onSelectInvestor(investor)}
            onRemove={() => onRemoveInvestor(investor.cik)}
          />
        ))
      )}
    </div>
  );
}
