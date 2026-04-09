"use client";

import { useState, useMemo } from "react";
import type { ConvictionData } from "@/lib/alert-types";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface ConvictionTimelineProps {
  data: ConvictionData;
}

type SortMode = "quarters" | "streak" | "weight";

interface CellTooltipState {
  visible: boolean;
  x: number;
  y: number;
  investorName: string;
  quarter: string;
  shares: number;
  value: number;
  portfolioWeight: number;
}

function getCellBg(held: boolean, weight: number): string {
  if (!held) return "transparent";
  const alpha = Math.min(weight / 10, 0.8) + 0.1;
  return `rgba(68,138,255,${alpha})`;
}

function truncateName(name: string, maxLen = 20): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "\u2026";
}

function shortenQuarter(quarter: string): string {
  // "Q4 2025" -> "Q4 25"
  const parts = quarter.split(" ");
  if (parts.length === 2 && parts[1].length === 4) {
    return `${parts[0]} ${parts[1].slice(2)}`;
  }
  return quarter;
}

export function ConvictionTimeline({ data }: ConvictionTimelineProps) {
  const [sortMode, setSortMode] = useState<SortMode>("quarters");
  const [tooltip, setTooltip] = useState<CellTooltipState>({
    visible: false,
    x: 0,
    y: 0,
    investorName: "",
    quarter: "",
    shares: 0,
    value: 0,
    portfolioWeight: 0,
  });

  // Collect all unique quarters across all investors, sorted chronologically
  const allQuarters = useMemo(() => {
    const quarterSet = new Set<string>();
    for (const investor of data.investors) {
      for (const qh of investor.quarterHistory) {
        quarterSet.add(qh.quarter);
      }
    }
    return Array.from(quarterSet).sort((a, b) => {
      // Parse "Q1 2024" format
      const [qa, ya] = [a.slice(1, 2), a.slice(3)];
      const [qb, yb] = [b.slice(1, 2), b.slice(3)];
      const na = Number(ya) * 4 + Number(qa);
      const nb = Number(yb) * 4 + Number(qb);
      return na - nb;
    });
  }, [data.investors]);

  // Sort investors
  const sortedInvestors = useMemo(() => {
    const sorted = [...data.investors];
    switch (sortMode) {
      case "quarters":
        sorted.sort((a, b) => b.totalQuartersHeld - a.totalQuartersHeld);
        break;
      case "streak":
        sorted.sort((a, b) => b.currentStreak - a.currentStreak);
        break;
      case "weight": {
        const getLatestWeight = (inv: ConvictionData["investors"][0]) => {
          if (inv.quarterHistory.length === 0) return 0;
          return inv.quarterHistory[inv.quarterHistory.length - 1]
            .portfolioWeight;
        };
        sorted.sort((a, b) => getLatestWeight(b) - getLatestWeight(a));
        break;
      }
    }
    return sorted;
  }, [data.investors, sortMode]);

  // Build lookup for quick cell rendering
  const investorQuarterMap = useMemo(() => {
    const map = new Map<
      string,
      Map<string, { shares: number; value: number; portfolioWeight: number }>
    >();
    for (const investor of data.investors) {
      const qMap = new Map<
        string,
        { shares: number; value: number; portfolioWeight: number }
      >();
      for (const qh of investor.quarterHistory) {
        qMap.set(qh.quarter, qh);
      }
      map.set(investor.cik, qMap);
    }
    return map;
  }, [data.investors]);

  const handleCellMouseEnter = (
    e: React.MouseEvent,
    investorName: string,
    quarter: string,
    cellData: { shares: number; value: number; portfolioWeight: number } | undefined
  ) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      investorName,
      quarter,
      shares: cellData?.shares || 0,
      value: cellData?.value || 0,
      portfolioWeight: cellData?.portfolioWeight || 0,
    });
  };

  const handleCellMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  if (data.investors.length === 0) {
    return (
      <div className="text-center py-6 text-text-muted text-xs">
        No investor holding history found for {data.symbol}
      </div>
    );
  }

  if (allQuarters.length === 0) {
    return (
      <div className="text-center py-6 text-text-muted text-xs">
        No quarterly data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted uppercase tracking-wider">
          Sort by:
        </span>
        {(
          [
            { key: "quarters", label: "Total Quarters" },
            { key: "streak", label: "Current Streak" },
            { key: "weight", label: "Portfolio Weight" },
          ] as { key: SortMode; label: string }[]
        ).map((option) => (
          <button
            key={option.key}
            onClick={() => setSortMode(option.key)}
            className={cn(
              "px-2 py-1 text-[10px] rounded transition-colors",
              sortMode === option.key
                ? "bg-surface-3 text-text-primary font-medium"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `140px repeat(${allQuarters.length}, minmax(36px, 1fr))`,
          }}
        >
          {/* Header row: quarter labels */}
          <div className="sticky left-0 bg-surface-1 z-10" />
          {allQuarters.map((q) => (
            <div
              key={q}
              className="text-center text-[9px] text-text-muted py-1 px-0.5"
            >
              {shortenQuarter(q)}
            </div>
          ))}

          {/* Investor rows */}
          {sortedInvestors.map((investor) => {
            const qMap = investorQuarterMap.get(investor.cik);

            return (
              <>
                {/* Investor name label */}
                <div
                  key={`label-${investor.cik}`}
                  className="sticky left-0 bg-surface-1 z-10 flex items-center pr-2 text-[11px] text-text-secondary truncate py-1"
                  title={investor.name}
                >
                  {truncateName(investor.name)}
                </div>

                {/* Quarter cells */}
                {allQuarters.map((q) => {
                  const cellData = qMap?.get(q);
                  const held = !!cellData && cellData.shares > 0;
                  const weight = cellData?.portfolioWeight || 0;

                  return (
                    <div
                      key={`${investor.cik}-${q}`}
                      className={cn(
                        "m-0.5 rounded-sm min-h-[24px] transition-all cursor-default",
                        !held && "border border-border"
                      )}
                      style={{
                        backgroundColor: getCellBg(held, weight),
                      }}
                      onMouseEnter={(e) =>
                        handleCellMouseEnter(e, investor.name, q, cellData)
                      }
                      onMouseLeave={handleCellMouseLeave}
                    />
                  );
                })}
              </>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        <span>Weight:</span>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-3 rounded-sm"
            style={{ backgroundColor: getCellBg(true, 1) }}
          />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-3 rounded-sm"
            style={{ backgroundColor: getCellBg(true, 5) }}
          />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-3 rounded-sm"
            style={{ backgroundColor: getCellBg(true, 10) }}
          />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <div className="w-4 h-3 rounded-sm border border-border" />
          <span>Not held</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 bg-surface-2 border border-border rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 8}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-xs font-semibold text-text-primary mb-1">
            {tooltip.investorName}
          </p>
          <p className="text-[10px] text-text-muted mb-1">{tooltip.quarter}</p>
          {tooltip.shares > 0 ? (
            <div className="space-y-0.5 text-[10px] text-text-secondary">
              <p>Shares: {tooltip.shares.toLocaleString()}</p>
              <p>Value: {formatCurrency(tooltip.value, "USD", true)}</p>
              <p>Portfolio Weight: {tooltip.portfolioWeight.toFixed(2)}%</p>
            </div>
          ) : (
            <p className="text-[10px] text-text-muted">Not held</p>
          )}
        </div>
      )}
    </div>
  );
}
