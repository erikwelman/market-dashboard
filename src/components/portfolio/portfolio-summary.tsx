"use client";

import type { PortfolioPerformance } from "@/hooks/use-portfolio-performance";
import type { PortfolioHistoryPoint } from "@/hooks/use-portfolio-history";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface PortfolioSummaryProps {
  performance: PortfolioPerformance | null;
  historyData: PortfolioHistoryPoint[];
  benchmarkLabel: string;
  isLoading: boolean;
}

function SummaryCardSkeleton() {
  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4 animate-pulse">
      <div className="h-3 w-20 bg-surface-3 rounded mb-2" />
      <div className="h-6 w-28 bg-surface-3 rounded mb-1" />
      <div className="h-3 w-16 bg-surface-3 rounded" />
    </div>
  );
}

interface CardProps {
  label: string;
  value: string;
  subValue?: string;
  positive?: boolean;
  neutral?: boolean;
}

function SummaryCard({ label, value, subValue, positive, neutral }: CardProps) {
  const valueColor = neutral
    ? "text-text-primary"
    : positive
    ? "text-gain"
    : "text-loss";

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-lg font-semibold ${valueColor}`}>{value}</div>
      {subValue && (
        <div className={`text-xs mt-0.5 ${valueColor}`}>{subValue}</div>
      )}
    </div>
  );
}

export function PortfolioSummary({
  performance,
  historyData,
  benchmarkLabel,
  isLoading,
}: PortfolioSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>
    );
  }

  if (!performance) {
    return null;
  }

  const lastHistory = historyData.length > 0 ? historyData[historyData.length - 1] : null;

  return (
    <div className="space-y-3 mb-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Value"
          value={formatCurrency(performance.totalValue)}
          neutral
        />
        <SummaryCard
          label="Total Cost"
          value={formatCurrency(performance.totalCost)}
          neutral
        />
        <SummaryCard
          label="Total P&L"
          value={formatCurrency(performance.totalPnl)}
          subValue={formatPercent(performance.totalPnlPercent)}
          positive={performance.totalPnl >= 0}
        />
        <SummaryCard
          label="Day Change"
          value={formatCurrency(performance.dayChange)}
          subValue={formatPercent(performance.dayChangePercent)}
          positive={performance.dayChange >= 0}
        />
      </div>

      {/* Benchmark comparison */}
      {lastHistory && (
        <div className="bg-surface-1 border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-muted mb-1">
            Performance vs Benchmark (since inception)
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-secondary">Your portfolio:</span>
            <span
              className={
                lastHistory.portfolioValue >= 0 ? "text-gain font-medium" : "text-loss font-medium"
              }
            >
              {formatPercent(lastHistory.portfolioValue)}
            </span>
            <span className="text-text-muted">vs</span>
            <span className="text-text-secondary">{benchmarkLabel}:</span>
            <span
              className={
                lastHistory.benchmarkValue >= 0 ? "text-gain font-medium" : "text-loss font-medium"
              }
            >
              {formatPercent(lastHistory.benchmarkValue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
