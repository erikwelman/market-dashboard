"use client";

import { useState } from "react";
import type { PositionPerformance } from "@/hooks/use-portfolio-performance";
import type { Instrument } from "@/lib/market-data/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

type SortKey = keyof PositionPerformance;
type SortDir = "asc" | "desc";

interface PositionsTableProps {
  positions: PositionPerformance[];
  isLoading: boolean;
  onSelectInstrument: (instrument: Instrument) => void;
  onAddTransaction: () => void;
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-3 py-3">
              <div className="h-4 w-16 bg-surface-3 rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "symbol", label: "Symbol" },
  { key: "shares", label: "Shares", align: "right" },
  { key: "avgCostBasis", label: "Avg Cost", align: "right" },
  { key: "currentPrice", label: "Price", align: "right" },
  { key: "currentValue", label: "Value", align: "right" },
  { key: "pnl", label: "P&L ($)", align: "right" },
  { key: "pnlPercent", label: "P&L (%)", align: "right" },
  { key: "weight", label: "Weight", align: "right" },
];

export function PositionsTable({
  positions,
  isLoading,
  onSelectInstrument,
  onAddTransaction,
}: PositionsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("currentValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...positions].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    const aNum = Number(aVal) || 0;
    const bNum = Number(bVal) || 0;
    return sortDir === "asc" ? aNum - bNum : bNum - aNum;
  });

  const handleRowClick = (position: PositionPerformance) => {
    const instrument: Instrument = {
      symbol: position.symbol,
      providerSymbol: position.symbol,
      name: position.symbol,
      type: "equity",
    };
    onSelectInstrument(instrument);
  };

  return (
    <div className="bg-surface-1 border border-border rounded-lg mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Positions</h3>
        <button
          onClick={onAddTransaction}
          className="text-xs text-accent hover:text-accent-hover font-medium transition-colors px-2 py-1 rounded hover:bg-surface-3"
        >
          + Add Transaction
        </button>
      </div>

      {positions.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center py-12 text-text-muted text-sm">
          No positions yet. Add a transaction to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" role="table">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 font-medium text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                    onClick={() => handleSort(col.key)}
                    role="columnheader"
                    aria-sort={
                      sortKey === col.key
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1">
                        {sortDir === "asc" ? "\u2191" : "\u2193"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                sorted.map((pos) => (
                  <tr
                    key={pos.symbol}
                    onClick={() => handleRowClick(pos)}
                    className="border-b border-border last:border-b-0 hover:bg-surface-2 cursor-pointer transition-colors"
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(pos);
                      }
                    }}
                  >
                    <td className="px-3 py-3 font-medium text-text-primary">
                      {pos.symbol}
                    </td>
                    <td className="px-3 py-3 text-right text-text-secondary">
                      {pos.shares.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-text-secondary">
                      {formatCurrency(pos.avgCostBasis)}
                    </td>
                    <td className="px-3 py-3 text-right text-text-primary">
                      {formatCurrency(pos.currentPrice)}
                    </td>
                    <td className="px-3 py-3 text-right text-text-primary font-medium">
                      {formatCurrency(pos.currentValue)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-medium ${
                        pos.pnl >= 0 ? "text-gain" : "text-loss"
                      }`}
                    >
                      {formatCurrency(pos.pnl)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-medium ${
                        pos.pnlPercent >= 0 ? "text-gain" : "text-loss"
                      }`}
                    >
                      {formatPercent(pos.pnlPercent)}
                    </td>
                    <td className="px-3 py-3 text-right text-text-secondary">
                      {pos.weight.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
