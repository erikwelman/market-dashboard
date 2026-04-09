"use client";

import { useState, useMemo, useEffect } from "react";
import type { TrackedInvestor, Filing } from "@/lib/investor-data/types";
import {
  useFilingHistory,
  useHoldings,
  usePositionChanges,
} from "@/hooks/use-investor-filing";
import { HoldingsTable } from "./holdings-table";
import { PositionChangeTable } from "./position-change-table";
import {
  reportDateToQuarter,
  formatFilingDate,
} from "@/lib/investor-data/quarters";
import { cn, formatCurrency } from "@/lib/utils";

interface InvestorDetailPanelProps {
  investor: TrackedInvestor;
  onClose: () => void;
}

type Tab = "holdings" | "activity" | "buys" | "sells";

export function InvestorDetailPanel({
  investor,
  onClose,
}: InvestorDetailPanelProps) {
  const [tab, setTab] = useState<Tab>("holdings");
  const [selectedFilingIdx, setSelectedFilingIdx] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { data: historyData, isLoading: historyLoading } = useFilingHistory(
    investor.cik
  );

  // Get 13F filings only
  const filings: Filing[] = useMemo(
    () => historyData?.filings ?? [],
    [historyData]
  );

  const selectedFiling = filings[selectedFilingIdx] ?? null;
  const quarterLabel = selectedFiling
    ? reportDateToQuarter(selectedFiling.reportDate)
    : "";

  // Fetch holdings and changes for selected quarter
  const { data: holdings, isLoading: holdingsLoading, isError: holdingsError, refetch: refetchHoldings } = useHoldings(
    investor.cik,
    selectedFiling?.accessionNumber ?? null
  );
  const { data: changes, isLoading: changesLoading, isError: changesError, refetch: refetchChanges } = usePositionChanges(
    investor.cik,
    selectedFiling?.accessionNumber ?? null
  );



  // Compute summary stats from changes
  const stats = useMemo(() => {
    if (!changes) return null;
    const active = changes.filter((c) => c.changeType !== "UNCHANGED");
    return {
      buys: changes.filter((c) => c.changeType === "NEW").length,
      adds: changes.filter((c) => c.changeType === "ADDED").length,
      reduces: changes.filter((c) => c.changeType === "REDUCED").length,
      exits: changes.filter((c) => c.changeType === "EXITED").length,
      totalActivity: active.length,
    };
  }, [changes]);

  const totalValue = useMemo(
    () => holdings?.reduce((sum, h) => sum + h.value, 0) ?? 0,
    [holdings]
  );

  // If on a now-empty tab, show holdings instead
  const buysEmpty = stats ? stats.buys + stats.adds === 0 : false;
  const sellsEmpty = stats ? stats.reduces + stats.exits === 0 : false;
  const effectiveTab = (tab === "buys" && buysEmpty) || (tab === "sells" && sellsEmpty) ? "holdings" : tab;

  const isLoading = historyLoading || holdingsLoading || changesLoading;
  const hasError = holdingsError || changesError;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[600px] lg:max-w-none lg:left-0 bg-surface-1 border-l border-border lg:border-l-0 z-50 overflow-y-auto">
        <div className="p-6 lg:max-w-5xl lg:mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {investor.name}
              </h2>
              <p className="text-xs text-text-muted font-mono">
                CIK {investor.cik}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-xl transition-colors ml-4 shrink-0"
            >
              ×
            </button>
          </div>

          {/* Quarter + filing info bar */}
          {selectedFiling && (
            <div className="flex items-center gap-3 mt-3 mb-2">
              {/* Quarter label */}
              <span className="text-sm font-semibold text-accent">
                {quarterLabel}
              </span>
              <span className="text-xs text-text-muted">
                Filed {formatFilingDate(selectedFiling.filingDate)}
              </span>
              <span className="text-xs text-text-muted">
                Period ending {formatFilingDate(selectedFiling.reportDate)}
              </span>
            </div>
          )}

          {/* Portfolio stats row */}
          {holdings && (
            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs text-text-secondary">
                <span className="text-text-primary font-medium">
                  {holdings.length}
                </span>{" "}
                stocks
              </span>
              <span className="text-xs text-text-secondary">
                valued at{" "}
                <span className="text-text-primary font-medium tabular-nums">
                  {formatCurrency(totalValue, "USD", true)}
                </span>
              </span>
              {stats && stats.totalActivity > 0 && (
                <span className="text-xs text-text-muted">
                  {stats.buys > 0 && (
                    <span className="text-accent">
                      {stats.buys} buy{stats.buys !== 1 ? "s" : ""}
                    </span>
                  )}
                  {stats.adds > 0 && (
                    <>
                      {stats.buys > 0 && ", "}
                      <span className="text-gain">
                        {stats.adds} add{stats.adds !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                  {stats.reduces > 0 && (
                    <>
                      {(stats.buys > 0 || stats.adds > 0) && ", "}
                      <span className="text-loss">
                        {stats.reduces} reduce
                        {stats.reduces !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                  {stats.exits > 0 && (
                    <>
                      {(stats.buys > 0 ||
                        stats.adds > 0 ||
                        stats.reduces > 0) &&
                        ", "}
                      <span className="text-loss">
                        {stats.exits} sell{stats.exits !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>
          )}

          {/* 13F disclosure */}
          <div className="text-[10px] text-text-muted bg-surface-2 rounded px-3 py-1.5 mb-4">
            Based on 13F-HR filed with the SEC. Reflects holdings at period end,
            not current positions.
          </div>

          {/* Quarter navigation */}
          {filings.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              {/* Previous / Next buttons */}
              <button
                onClick={() =>
                  setSelectedFilingIdx((i) => Math.min(i + 1, filings.length - 1))
                }
                disabled={selectedFilingIdx >= filings.length - 1}
                className="text-xs text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors px-1"
                title="Older quarter"
              >
                ‹ Prev
              </button>

              {/* Quick quarter buttons (show up to 4 recent) */}
              <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                {filings.slice(0, 4).map((f, idx) => (
                  <button
                    key={f.accessionNumber}
                    onClick={() => setSelectedFilingIdx(idx)}
                    className={cn(
                      "px-2 py-1 text-[11px] font-medium rounded whitespace-nowrap transition-colors",
                      selectedFilingIdx === idx
                        ? "text-accent bg-accent/10"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
                    )}
                  >
                    {reportDateToQuarter(f.reportDate)}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setSelectedFilingIdx((i) => Math.max(i - 1, 0))
                }
                disabled={selectedFilingIdx <= 0}
                className="text-xs text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors px-1"
                title="Newer quarter"
              >
                Next ›
              </button>

              {/* History toggle */}
              <button
                onClick={() => setShowHistory((v) => !v)}
                className={cn(
                  "text-[11px] font-medium px-2 py-1 rounded transition-colors",
                  showHistory
                    ? "text-accent bg-accent/10"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-3"
                )}
              >
                History
              </button>
            </div>
          )}

          {/* History dropdown */}
          {showHistory && filings.length > 0 && (
            <div className="mb-4 border border-border rounded overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider bg-surface-2 border-b border-border">
                Filing History
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {filings.map((f, idx) => (
                  <button
                    key={f.accessionNumber}
                    onClick={() => {
                      setSelectedFilingIdx(idx);
                      setShowHistory(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors border-b border-border last:border-b-0",
                      selectedFilingIdx === idx
                        ? "bg-accent/5 text-accent"
                        : "hover:bg-surface-2 text-text-primary"
                    )}
                  >
                    <span className="font-medium">
                      {reportDateToQuarter(f.reportDate)}
                    </span>
                    <span className="text-text-secondary tabular-nums">
                      Filed {formatFilingDate(f.filingDate)}
                    </span>
                    <span className="text-text-muted text-[10px]">
                      {f.form}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs: Holdings | Activity | Buys | Sells */}
          <div className="flex items-center gap-1 mb-5 border-b border-border">
            {(
              [
                { key: "holdings", label: "Holdings" },
                { key: "activity", label: "Activity" },
                { key: "buys", label: "Buys" },
                { key: "sells", label: "Sells" },
              ] as { key: Tab; label: string }[]
            ).map((t) => {
              const buysCount = stats ? stats.buys + stats.adds : 0;
              const sellsCount = stats ? stats.reduces + stats.exits : 0;
              const disabled =
                (t.key === "buys" && stats && buysCount === 0) ||
                (t.key === "sells" && stats && sellsCount === 0);

              return (
                <button
                  key={t.key}
                  onClick={() => !disabled && setTab(t.key)}
                  disabled={!!disabled}
                  className={cn(
                    "px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-[1px]",
                    disabled
                      ? "text-text-muted/40 border-transparent cursor-not-allowed"
                      : effectiveTab === t.key
                        ? "text-accent border-accent"
                        : "text-text-secondary border-transparent hover:text-text-primary"
                  )}
                >
                  {t.label}
                  {/* Show count badges */}
                  {stats && t.key === "activity" && stats.totalActivity > 0 && (
                    <span className="ml-1 text-text-muted">
                      {stats.totalActivity}
                    </span>
                  )}
                  {stats && t.key === "buys" && buysCount > 0 && (
                    <span className="ml-1 text-gain">
                      {buysCount}
                    </span>
                  )}
                  {stats && t.key === "sells" && sellsCount > 0 && (
                    <span className="ml-1 text-loss">
                      {sellsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 bg-surface-3 rounded animate-pulse"
                />
              ))}
            </div>
          ) : hasError ? (
            <div className="py-8 text-center">
              <div className="text-sm text-text-muted mb-3">
                Failed to load holdings data. The SEC may be temporarily rate-limiting requests.
              </div>
              <button
                onClick={() => { refetchHoldings(); refetchChanges(); }}
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : !selectedFiling ? (
            <div className="text-sm text-text-muted py-8 text-center">
              No 13F filing data available
            </div>
          ) : (
            <>
              {effectiveTab === "holdings" && holdings && (
                <HoldingsTable
                  holdings={holdings}
                  changes={changes ?? undefined}
                  quarterLabel={quarterLabel}
                />
              )}

              {effectiveTab === "activity" && changes && (
                <PositionChangeTable
                  changes={changes}
                  quarterLabel={quarterLabel}
                />
              )}

              {effectiveTab === "buys" && changes && (
                <PositionChangeTable
                  changes={changes}
                  filter="BUYS"
                  quarterLabel={quarterLabel}
                />
              )}

              {effectiveTab === "sells" && changes && (
                <PositionChangeTable
                  changes={changes}
                  filter="SELLS"
                  quarterLabel={quarterLabel}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
