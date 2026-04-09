"use client";

import { useEarningsCalendar } from "@/hooks/use-earnings";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

interface EarningsSnapshotProps {
  symbol: string;
}

export function EarningsSnapshot({ symbol }: EarningsSnapshotProps) {
  const { data, isLoading, isError, refetch } = useEarningsCalendar([symbol]);

  if (isLoading) return <EarningsSnapshotSkeleton />;
  if (isError) return <ErrorState message="Failed to load earnings" onRetry={refetch} />;

  const earnings = data?.find((e) => e.symbol === symbol);
  if (!earnings) return <EmptyState message="No earnings data available" />;

  const countdown = earnings.nextEarningsDate
    ? getCountdown(earnings.nextEarningsDate)
    : null;

  const lastFourQuarters = earnings.earningsHistory.slice(-4);

  // Find max absolute surprise for bar scaling
  const maxSurprise = Math.max(
    ...lastFourQuarters
      .map((q) => Math.abs(q.surprise ?? 0))
      .filter((v) => v > 0),
    0.01
  );

  return (
    <div className="bg-surface-2 rounded-lg p-4 space-y-3">
      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">
        Earnings
      </h4>

      {/* Next earnings date */}
      {earnings.nextEarningsDate ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Next Report</span>
          <div className="text-right">
            <span className="text-sm font-medium text-text-primary">
              {formatDate(earnings.nextEarningsDate)}
            </span>
            {countdown && (
              <span className="text-xs text-text-muted ml-2">
                ({countdown})
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs text-text-muted">
          Next earnings date not available
        </div>
      )}

      {/* Last 4 quarters EPS surprise bars */}
      {lastFourQuarters.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">
            EPS Surprise (Last {lastFourQuarters.length} Quarters)
          </div>
          <div className="flex items-end gap-1.5 h-12">
            {lastFourQuarters.map((q, i) => {
              const surprise = q.surprise ?? 0;
              const pct = maxSurprise > 0 ? Math.abs(surprise) / maxSurprise : 0;
              const height = Math.max(pct * 100, 8);
              const beat = surprise >= 0;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-0.5"
                >
                  <div className="w-full flex items-end justify-center h-10">
                    <div
                      className={cn(
                        "w-full max-w-[20px] rounded-t",
                        beat ? "bg-gain" : "bg-loss"
                      )}
                      style={{ height: `${height}%` }}
                      title={`${q.quarter}: ${surprise >= 0 ? "+" : ""}${surprise.toFixed(2)} (${q.surprisePct != null ? `${q.surprisePct.toFixed(1)}%` : "N/A"})`}
                    />
                  </div>
                  <span className="text-[9px] text-text-muted truncate w-full text-center">
                    {q.quarter}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-text-muted">
            <span>
              {lastFourQuarters.filter((q) => (q.surprise ?? 0) >= 0).length}/
              {lastFourQuarters.length} beats
            </span>
            <span>
              Avg surprise:{" "}
              {(
                lastFourQuarters.reduce(
                  (sum, q) => sum + (q.surprisePct ?? 0),
                  0
                ) / lastFourQuarters.length
              ).toFixed(1)}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function EarningsSnapshotSkeleton() {
  return (
    <div className="bg-surface-2 rounded-lg p-4 space-y-3">
      <div className="h-3 w-16 bg-surface-3 rounded animate-pulse" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-surface-3 rounded animate-pulse" />
        <div className="h-4 w-28 bg-surface-3 rounded animate-pulse" />
      </div>
      <div className="flex items-end gap-1.5 h-12 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full max-w-[20px] bg-surface-3 rounded-t animate-pulse"
              style={{ height: `${30 + i * 15}%` }}
            />
            <div className="h-2 w-6 bg-surface-3 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getCountdown(dateStr: string): string | null {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) return "past";

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
  return `in ${Math.ceil(days / 30)} months`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
