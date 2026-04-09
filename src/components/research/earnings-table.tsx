"use client";

import { useMemo } from "react";
import type { EarningsData } from "@/lib/alert-types";
import type { Instrument } from "@/lib/market-data/types";
import { cn, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

interface EarningsTableProps {
  earningsData: EarningsData[];
  instruments: Instrument[];
  onSelectInstrument: (instrument: Instrument) => void;
}

interface FlattenedEarning {
  symbol: string;
  companyName: string;
  quarter: string;
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  surprise: number | null;
  surprisePct: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  isUpcoming: boolean;
  daysUntil: number | null;
}

export function EarningsTable({
  earningsData,
  instruments,
  onSelectInstrument,
}: EarningsTableProps) {
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const flat: FlattenedEarning[] = [];

    for (const ed of earningsData) {
      // Add upcoming earnings if available
      if (ed.nextEarningsDate) {
        const target = new Date(ed.nextEarningsDate);
        const diffMs = target.getTime() - now.getTime();
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysUntil >= 0) {
          flat.push({
            symbol: ed.symbol,
            companyName: ed.companyName,
            quarter: "Upcoming",
            date: ed.nextEarningsDate,
            epsEstimate: null,
            epsActual: null,
            surprise: null,
            surprisePct: null,
            revenueEstimate: null,
            revenueActual: null,
            isUpcoming: true,
            daysUntil,
          });
        }
      }

      // Add historical earnings
      for (const h of ed.earningsHistory) {
        flat.push({
          symbol: ed.symbol,
          companyName: ed.companyName,
          quarter: h.quarter,
          date: h.date,
          epsEstimate: h.epsEstimate,
          epsActual: h.epsActual,
          surprise: h.surprise,
          surprisePct: h.surprisePct,
          revenueEstimate: h.revenueEstimate,
          revenueActual: h.revenueActual,
          isUpcoming: false,
          daysUntil: null,
        });
      }
    }

    const upcoming = flat
      .filter((e) => e.isUpcoming)
      .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));

    const past = flat
      .filter((e) => !e.isUpcoming)
      .sort((a, b) => b.date.localeCompare(a.date));

    return { upcoming, past };
  }, [earningsData]);

  if (upcoming.length === 0 && past.length === 0) {
    return <EmptyState message="No earnings data available" />;
  }

  const findInstrument = (symbol: string) =>
    instruments.find(
      (i) => i.symbol === symbol || i.providerSymbol === symbol
    );

  const handleRowClick = (symbol: string) => {
    const inst = findInstrument(symbol);
    if (inst) onSelectInstrument(inst);
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Earnings */}
      {upcoming.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Upcoming Earnings
          </h4>
          <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-3 py-2 text-text-muted font-medium">
                    Date
                  </th>
                  <th className="text-left px-3 py-2 text-text-muted font-medium">
                    Symbol
                  </th>
                  <th className="text-left px-3 py-2 text-text-muted font-medium">
                    Company
                  </th>
                  <th className="text-right px-3 py-2 text-text-muted font-medium">
                    Countdown
                  </th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((e, i) => (
                  <tr
                    key={`upcoming-${e.symbol}-${i}`}
                    className="border-b border-border/50 hover:bg-surface-2 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(e.symbol)}
                  >
                    <td className="px-3 py-2 text-text-secondary tabular-nums">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-3 py-2 font-medium text-text-primary">
                      {e.symbol}
                    </td>
                    <td className="px-3 py-2 text-text-secondary truncate max-w-[140px]">
                      {e.companyName}
                    </td>
                    <td className="px-3 py-2 text-right text-accent font-medium">
                      {formatCountdown(e.daysUntil)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past Earnings */}
      {past.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Past Earnings
          </h4>
          <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-3 py-2 text-text-muted font-medium">
                    Quarter
                  </th>
                  <th className="text-left px-3 py-2 text-text-muted font-medium">
                    Symbol
                  </th>
                  <th className="text-left px-3 py-2 text-text-muted font-medium">
                    Company
                  </th>
                  <th className="text-right px-3 py-2 text-text-muted font-medium">
                    EPS Est
                  </th>
                  <th className="text-right px-3 py-2 text-text-muted font-medium">
                    EPS Actual
                  </th>
                  <th className="text-right px-3 py-2 text-text-muted font-medium">
                    Surprise
                  </th>
                  <th className="text-right px-3 py-2 text-text-muted font-medium">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {past.map((e, i) => {
                  const beat =
                    e.surprise != null ? e.surprise >= 0 : undefined;

                  return (
                    <tr
                      key={`past-${e.symbol}-${e.quarter}-${i}`}
                      className="border-b border-border/50 hover:bg-surface-2 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(e.symbol)}
                    >
                      <td className="px-3 py-2 text-text-secondary tabular-nums">
                        {e.quarter}
                      </td>
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {e.symbol}
                      </td>
                      <td className="px-3 py-2 text-text-secondary truncate max-w-[120px]">
                        {e.companyName}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                        {e.epsEstimate != null
                          ? `$${e.epsEstimate.toFixed(2)}`
                          : "N/A"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {e.epsActual != null
                          ? `$${e.epsActual.toFixed(2)}`
                          : "N/A"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-medium tabular-nums",
                          beat === true && "text-gain",
                          beat === false && "text-loss",
                          beat === undefined && "text-text-muted"
                        )}
                      >
                        {e.surprisePct != null
                          ? `${e.surprisePct >= 0 ? "+" : ""}${e.surprisePct.toFixed(1)}%`
                          : "N/A"}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                        {e.revenueActual != null
                          ? formatCurrency(e.revenueActual, "USD", true)
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCountdown(days: number | null): string {
  if (days == null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
  return `in ${Math.ceil(days / 30)} months`;
}
