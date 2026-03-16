"use client";

import { useQuery } from "@tanstack/react-query";
import type { InvestorOverlap } from "@/lib/investor-data/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface InvestorOverlapPanelProps {
  cusip: string;
  trackedCiks: string[];
}

async function fetchOverlap(
  cusip: string,
  ciks: string[]
): Promise<InvestorOverlap[]> {
  const res = await fetch(
    `/api/investor/overlap?cusip=${cusip}&ciks=${ciks.join(",")}`
  );
  if (!res.ok) throw new Error("Failed to fetch overlap");
  return res.json();
}

export function InvestorOverlapPanel({
  cusip,
  trackedCiks,
}: InvestorOverlapPanelProps) {
  const { data: overlaps, isLoading } = useQuery({
    queryKey: ["investor-overlap", cusip, trackedCiks.join(",")],
    queryFn: () => fetchOverlap(cusip, trackedCiks),
    enabled: !!cusip && trackedCiks.length > 0,
    staleTime: 30 * 60_000,
  });

  if (trackedCiks.length === 0) return null;
  if (isLoading) {
    return (
      <div className="mt-4">
        <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
          Smart Money Holders
        </h4>
        <div className="h-12 bg-surface-3 rounded animate-pulse" />
      </div>
    );
  }
  if (!overlaps || overlaps.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
        Smart Money Holders
      </h4>
      <div className="border border-border rounded overflow-hidden">
        {overlaps.map((o) => (
          <div
            key={o.cik}
            className="flex items-center justify-between px-3 py-2 text-xs border-b border-border last:border-b-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-text-primary truncate">
                {o.investorName}
              </span>
              {o.changeType && o.changeType !== "UNCHANGED" && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1 py-0.5 rounded shrink-0",
                    o.changeType === "NEW"
                      ? "text-accent bg-accent/10"
                      : o.changeType === "ADDED"
                        ? "text-gain bg-gain-bg"
                        : o.changeType === "REDUCED"
                          ? "text-loss bg-loss-bg"
                          : "text-text-muted bg-surface-3"
                  )}
                >
                  {o.changeType}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-text-secondary tabular-nums">
                {formatNumber(o.shares)} shares
              </span>
              <span className="text-text-primary tabular-nums">
                {formatCurrency(o.value, "USD", true)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
