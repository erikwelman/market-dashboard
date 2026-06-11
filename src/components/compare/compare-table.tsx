"use client";

import { useState, useMemo } from "react";
import type { Instrument } from "@/lib/market-data/types";
import type { Fundamentals } from "@/lib/alert-types";
import { COMPARE_METRICS, median, heatColor } from "@/lib/compare-metrics";
import { cn } from "@/lib/utils";

export interface CompareRow {
  instrument: Instrument;
  data: Fundamentals | undefined;
  isLoading: boolean;
  isError: boolean;
}

interface CompareTableProps {
  rows: CompareRow[];
  onSelect: (instrument: Instrument) => void;
  onRemove: (providerSymbol: string) => void;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function CompareTable({ rows, onSelect, onRemove }: CompareTableProps) {
  const [sort, setSort] = useState<SortState>(null);

  const medians = useMemo(() => {
    const result: Record<string, number | null> = {};
    for (const metric of COMPARE_METRICS) {
      const values = rows
        .map((row) => (row.data ? metric.getValue(row.data) : null))
        .filter((v): v is number => v != null);
      result[metric.key] = median(values);
    }
    return result;
  }, [rows]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const metric = COMPARE_METRICS.find((m) => m.key === sort.key);
    if (!metric) return rows;
    return [...rows].sort((a, b) => {
      const av = a.data ? metric.getValue(a.data) : null;
      const bv = b.data ? metric.getValue(b.data) : null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls last regardless of direction
      if (bv == null) return -1;
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [rows, sort]);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === "asc"
          ? { key, dir: "desc" }
          : null
        : { key, dir: "asc" }
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-max">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 bg-surface-1 text-left px-4 py-2.5 text-[10px] text-text-muted uppercase tracking-wider font-medium z-10">
              Symbol
            </th>
            {COMPARE_METRICS.map((metric) => (
              <th
                key={metric.key}
                onClick={() => toggleSort(metric.key)}
                className={cn(
                  "text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium cursor-pointer select-none whitespace-nowrap transition-colors",
                  sort?.key === metric.key
                    ? "text-accent"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {metric.label}
                {sort?.key === metric.key && (
                  <span className="ml-1">{sort.dir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
            <th className="w-8" />
          </tr>
          {/* Peer median row */}
          <tr className="border-b border-border bg-surface-2/50">
            <td className="sticky left-0 bg-surface-2 px-4 py-1.5 text-[10px] text-text-muted uppercase tracking-wider z-10">
              Median
            </td>
            {COMPARE_METRICS.map((metric) => (
              <td
                key={metric.key}
                className="text-right px-3 py-1.5 text-text-secondary tabular-nums"
              >
                {formatMedian(medians[metric.key], metric.key)}
              </td>
            ))}
            <td />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.instrument.providerSymbol}
              className="border-b border-border/50 hover:bg-surface-2/40 transition-colors group"
            >
              <td
                onClick={() => onSelect(row.instrument)}
                className="sticky left-0 bg-surface-1 group-hover:bg-surface-2 px-4 py-2.5 cursor-pointer z-10 transition-colors"
              >
                <div className="text-sm font-medium text-text-primary">
                  {row.instrument.symbol}
                </div>
                <div className="text-[10px] text-text-muted truncate max-w-[140px]">
                  {row.instrument.name}
                </div>
              </td>
              {row.isLoading ? (
                <td colSpan={COMPARE_METRICS.length} className="px-3 py-2.5">
                  <div className="h-3 bg-surface-3 rounded animate-pulse" />
                </td>
              ) : row.isError || !row.data ? (
                <td
                  colSpan={COMPARE_METRICS.length}
                  className="px-3 py-2.5 text-text-muted"
                >
                  No fundamentals data
                </td>
              ) : (
                COMPARE_METRICS.map((metric) => {
                  const display = metric.formatValue(row.data!);
                  const background = metric.heat
                    ? heatColor(
                        metric.getValue(row.data!),
                        medians[metric.key],
                        metric.betterDirection
                      )
                    : undefined;
                  return (
                    <td
                      key={metric.key}
                      style={background ? { background } : undefined}
                      className={cn(
                        "text-right px-3 py-2.5 tabular-nums whitespace-nowrap",
                        display == null ? "text-text-muted" : "text-text-primary"
                      )}
                    >
                      {display ?? "—"}
                    </td>
                  );
                })
              )}
              <td className="px-2 py-2.5 text-center">
                <button
                  onClick={() => onRemove(row.instrument.providerSymbol)}
                  title="Remove from comparison"
                  className="text-text-muted hover:text-loss opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatMedian(value: number | null, metricKey: string): string {
  if (value == null) return "—";
  const metric = COMPARE_METRICS.find((m) => m.key === metricKey);
  if (!metric) return "—";
  // Reuse the metric's own formatting via a minimal stand-in: medians are
  // already in display units, so format by magnitude
  if (metricKey === "marketCap") {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    return value.toFixed(0);
  }
  if (metricKey === "numberOfAnalystOpinions") return value.toFixed(0);
  if (
    [
      "grossMargin",
      "operatingMargin",
      "returnOnEquity",
      "revenueGrowth",
      "earningsGrowth",
      "dividendYield",
      "debtToEquity",
      "fiftyTwoWeekPosition",
      "impliedUpside",
    ].includes(metricKey)
  ) {
    return `${value.toFixed(1)}%`;
  }
  return value.toFixed(2);
}
