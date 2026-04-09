"use client";

import { useMemo } from "react";
import type { ConvictionData } from "@/lib/alert-types";
import { cn } from "@/lib/utils";

interface ConvictionSummaryProps {
  data: ConvictionData;
}

export function ConvictionSummary({ data }: ConvictionSummaryProps) {
  const stats = useMemo(() => {
    const currentHolders = data.investors.filter((i) => i.isCurrentHolder);
    const totalTracked = data.investors.length;

    const avgDuration =
      data.investors.length > 0
        ? data.investors.reduce((sum, i) => sum + i.totalQuartersHeld, 0) /
          data.investors.length
        : 0;

    // Longest current streak
    let longestStreakInvestor = "";
    let longestStreak = 0;
    for (const inv of data.investors) {
      if (inv.currentStreak > longestStreak) {
        longestStreak = inv.currentStreak;
        longestStreakInvestor = inv.name;
      }
    }

    const increasing = data.investors.filter(
      (i) => i.trend === "INCREASING"
    ).length;
    const decreasing = data.investors.filter(
      (i) => i.trend === "DECREASING"
    ).length;
    const stable = data.investors.filter(
      (i) => i.trend === "STABLE"
    ).length;
    const exited = data.investors.filter(
      (i) => i.trend === "EXITED"
    ).length;

    return {
      currentHolders: currentHolders.length,
      totalTracked,
      avgDuration: Math.round(avgDuration * 10) / 10,
      longestStreakInvestor,
      longestStreak,
      increasing,
      decreasing,
      stable,
      exited,
    };
  }, [data.investors]);

  if (data.investors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Symbol header */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          {data.symbol}
        </h3>
        <p className="text-xs text-text-secondary">{data.companyName}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Current holders */}
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            Current Holders
          </p>
          <p className="text-lg font-semibold text-text-primary">
            {stats.currentHolders}
            <span className="text-xs text-text-muted font-normal ml-1">
              / {stats.totalTracked}
            </span>
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            tracked investors hold this stock
          </p>
        </div>

        {/* Average duration */}
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            Avg Duration
          </p>
          <p className="text-lg font-semibold text-text-primary">
            {stats.avgDuration}
            <span className="text-xs text-text-muted font-normal ml-1">
              quarters
            </span>
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            average holding period
          </p>
        </div>

        {/* Longest streak */}
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            Longest Streak
          </p>
          <p className="text-lg font-semibold text-text-primary">
            {stats.longestStreak}
            <span className="text-xs text-text-muted font-normal ml-1">
              quarters
            </span>
          </p>
          {stats.longestStreakInvestor && (
            <p
              className="text-[10px] text-text-secondary mt-0.5 truncate"
              title={stats.longestStreakInvestor}
            >
              {stats.longestStreakInvestor}
            </p>
          )}
        </div>

        {/* Net sentiment */}
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            Net Sentiment
          </p>
          <div className="flex items-center gap-2 mt-1">
            {stats.increasing > 0 && (
              <span className="text-xs font-medium text-gain">
                {stats.increasing} increasing
              </span>
            )}
            {stats.decreasing > 0 && (
              <span className="text-xs font-medium text-loss">
                {stats.decreasing} decreasing
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {stats.stable > 0 && (
              <span className="text-[10px] text-text-muted">
                {stats.stable} stable
              </span>
            )}
            {stats.exited > 0 && (
              <span className="text-[10px] text-text-muted">
                {stats.exited} exited
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Investor trend badges */}
      <div className="flex flex-wrap gap-2">
        {data.investors.map((investor) => {
          const trendConfig = {
            INCREASING: {
              bg: "bg-gain-bg",
              text: "text-gain",
              arrow: "\u2191",
            },
            DECREASING: {
              bg: "bg-loss-bg",
              text: "text-loss",
              arrow: "\u2193",
            },
            STABLE: {
              bg: "bg-surface-3",
              text: "text-text-secondary",
              arrow: "\u2192",
            },
            EXITED: {
              bg: "bg-surface-3",
              text: "text-text-muted",
              arrow: "\u00D7",
            },
          };
          const config = trendConfig[investor.trend];

          return (
            <div
              key={investor.cik}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[11px]",
                config.bg
              )}
            >
              <span className={cn("font-medium", config.text)}>
                {config.arrow}
              </span>
              <span className="text-text-secondary truncate max-w-[120px]">
                {investor.name}
              </span>
              <span className="text-text-muted">
                {investor.totalQuartersHeld}Q
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
