"use client";

import { useInvestorConsensus } from "@/hooks/use-investor-consensus";
import { NetBoughtSoldTable } from "./net-bought-sold-table";

interface SmartMoneyTrendSummaryProps {
  ciks: string[];
}

export function SmartMoneyTrendSummary({ ciks }: SmartMoneyTrendSummaryProps) {
  const { data: consensus, isLoading, isError } = useInvestorConsensus(ciks);

  if (ciks.length === 0) return null;

  return (
    <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">
          Smart Money Consensus Trends
        </h2>
        <p className="text-[10px] text-text-muted mt-0.5">
          Aggregated from the latest 13F filings of your {ciks.length} tracked
          investor{ciks.length !== 1 ? "s" : ""}. These are quarter-end
          snapshots with a ~45-day reporting delay — not real-time trading
          activity.
        </p>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-40 bg-surface-3 rounded animate-pulse" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="h-8 bg-surface-3 rounded animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="px-4 py-8 text-center text-text-muted text-sm">
          Failed to load consensus data
        </div>
      ) : consensus ? (
        <div className="p-4">
          {consensus.investorsWithData === 0 ? (
            <div className="text-sm text-text-muted py-6 text-center">
              Not enough filing data to compute trends — investors need at least
              two 13F filings for comparison
            </div>
          ) : (
            <>
              {/* Investor coverage note */}
              <div className="text-[10px] text-text-muted mb-4">
                Based on {consensus.investorsWithData} of{" "}
                {consensus.investorCount} tracked investor
                {consensus.investorCount !== 1 ? "s" : ""} with comparable
                filings
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Net Bought */}
                <NetBoughtSoldTable
                  title="Most Net Bought"
                  stocks={consensus.mostNetBought}
                  direction="bought"
                />

                {/* Most Net Sold */}
                <NetBoughtSoldTable
                  title="Most Net Sold"
                  stocks={consensus.mostNetSold}
                  direction="sold"
                />
              </div>

              {/* Most Activity */}
              {consensus.mostActivity.length > 0 && (
                <div className="mt-6">
                  <NetBoughtSoldTable
                    title="Most Investor Activity"
                    subtitle="Highest total investor changes regardless of direction"
                    stocks={consensus.mostActivity}
                    direction="neutral"
                  />
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
