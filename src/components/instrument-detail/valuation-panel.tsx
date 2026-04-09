"use client";

import { useState, useMemo } from "react";
import { useDCFData } from "@/hooks/use-dcf-data";
import { deriveAssumptions, calculateDCF, generateSensitivityTable } from "@/lib/dcf-calculations";
import type { DCFAssumptions } from "@/lib/dcf-types";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

interface ValuationPanelProps {
  symbol: string;
}

export function ValuationPanel({ symbol }: ValuationPanelProps) {
  const { data, isLoading, isError, refetch } = useDCFData(symbol);
  const [overrides, setOverrides] = useState<Partial<DCFAssumptions>>({});

  const defaults = useMemo(() => {
    if (!data) return null;
    return deriveAssumptions(data);
  }, [data]);

  // Merge defaults with user overrides — recalculates whenever either changes
  const assumptions = defaults ? { ...defaults, ...overrides } as DCFAssumptions : null;

  const result = useMemo(() => {
    if (!data || !assumptions) return null;
    return calculateDCF(assumptions, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data,
    assumptions?.growthRate,
    assumptions?.terminalGrowthRate,
    assumptions?.discountRate,
    assumptions?.projectionYears,
    assumptions?.baseFCF,
  ]);

  const sensitivityTable = useMemo(() => {
    if (!data || !assumptions) return null;
    return generateSensitivityTable(assumptions, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data,
    assumptions?.growthRate,
    assumptions?.terminalGrowthRate,
    assumptions?.discountRate,
    assumptions?.projectionYears,
    assumptions?.baseFCF,
  ]);

  if (isLoading) return <ValuationSkeleton />;
  if (isError) return <ErrorState message="Failed to load valuation data" onRetry={refetch} />;
  if (!data || data.cashFlowHistory.length === 0) {
    return <EmptyState message="DCF not available for this instrument" />;
  }
  if (!assumptions || !result || !sensitivityTable) return <ValuationSkeleton />;

  const updateAssumption = <K extends keyof DCFAssumptions>(
    key: K,
    value: DCFAssumptions[K]
  ) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const resetDefaults = () => {
    setOverrides({});
  };

  const negativeFCF = assumptions.baseFCF <= 0;

  return (
    <div className="space-y-5">
      {/* (a) Result Header */}
      <div className="bg-surface-2 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-muted uppercase tracking-wider">
            Intrinsic Value
          </span>
          <span className="text-xs text-text-muted uppercase tracking-wider">
            Current Price
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold tabular-nums">
            {formatDollar(result.intrinsicValuePerShare)}
          </span>
          <span className="text-lg tabular-nums text-text-secondary">
            {formatDollar(result.currentPrice)}
          </span>
        </div>
        <div className="mt-2">
          <span
            className={cn(
              "text-sm font-medium px-2 py-0.5 rounded",
              result.upside >= 0
                ? "text-gain bg-gain-bg"
                : "text-loss bg-loss-bg"
            )}
          >
            {result.upside >= 0 ? "+" : ""}
            {(result.upside * 100).toFixed(1)}%{" "}
            {result.upside >= 0 ? "undervalued" : "overvalued"}
          </span>
        </div>
        {negativeFCF && (
          <p className="mt-2 text-xs text-yellow-400">
            Warning: Base FCF is negative. DCF may not be appropriate for this company.
          </p>
        )}
      </div>

      {/* (b) Key Assumptions */}
      <div className="border border-accent/30 bg-surface-2 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Key Assumptions
          </h4>
          <button
            onClick={resetDefaults}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Reset to defaults
          </button>
        </div>

        <AssumptionSlider
          label="Growth Rate"
          hint={
            data.analystGrowthEstimate != null
              ? `Analyst est: ${(data.analystGrowthEstimate * 100).toFixed(1)}%`
              : "Revenue CAGR"
          }
          value={assumptions.growthRate}
          min={0}
          max={0.30}
          step={0.005}
          format={formatPctInput}
          onChange={(v) => updateAssumption("growthRate", v)}
          warning={assumptions.growthRate > 0.20 ? "High growth assumption" : undefined}
        />

        <AssumptionSlider
          label="Terminal Growth"
          value={assumptions.terminalGrowthRate}
          min={0}
          max={0.04}
          step={0.0025}
          format={formatPctInput}
          onChange={(v) => updateAssumption("terminalGrowthRate", v)}
        />

        <AssumptionSlider
          label="Discount Rate (WACC)"
          hint={`Beta: ${data.beta?.toFixed(2) ?? "1.00"}`}
          value={assumptions.discountRate}
          min={0.03}
          max={0.20}
          step={0.005}
          format={formatPctInput}
          onChange={(v) => updateAssumption("discountRate", v)}
        />

        <AssumptionSlider
          label="Projection Years"
          value={assumptions.projectionYears}
          min={5}
          max={15}
          step={1}
          format={(v) => v.toString()}
          onChange={(v) => updateAssumption("projectionYears", v)}
          isInteger
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-text-secondary">Base FCF (TTM)</label>
          </div>
          <input
            type="number"
            value={Math.round(assumptions.baseFCF)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) updateAssumption("baseFCF", v);
            }}
            className="w-full bg-surface-3 rounded px-2 py-1 text-xs tabular-nums border border-border focus:border-accent outline-none"
          />
          <span className="text-[10px] text-text-muted">
            {formatCompact(assumptions.baseFCF)}
          </span>
        </div>
      </div>

      {/* (c) Historical Financials */}
      <div>
        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Historical Financials
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted border-b border-border">
                <th className="text-left py-1.5 pr-2">Year</th>
                {[...data.cashFlowHistory]
                  .sort((a, b) => a.year - b.year)
                  .map((cf) => (
                    <th key={cf.year} className="text-right py-1.5 px-2 tabular-nums">
                      {cf.year}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <HistoricalRow
                label="Revenue"
                values={[...data.cashFlowHistory]
                  .sort((a, b) => a.year - b.year)
                  .map((cf) => {
                    const rev = data.revenueHistory.find((r) => r.year === cf.year);
                    return rev?.totalRevenue ?? null;
                  })}
              />
              <HistoricalRow
                label="Operating CF"
                values={[...data.cashFlowHistory]
                  .sort((a, b) => a.year - b.year)
                  .map((cf) => cf.operatingCashflow)}
              />
              <HistoricalRow
                label="CapEx"
                values={[...data.cashFlowHistory]
                  .sort((a, b) => a.year - b.year)
                  .map((cf) => cf.capitalExpenditures)}
              />
              <HistoricalRow
                label="Free Cash Flow"
                values={[...data.cashFlowHistory]
                  .sort((a, b) => a.year - b.year)
                  .map((cf) => cf.freeCashFlow)}
                highlightLast
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* (d) Projected Cash Flows */}
      <div>
        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Projected Cash Flows
        </h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-muted border-b border-border">
              <th className="text-left py-1.5 pr-2">Year</th>
              <th className="text-right py-1.5 px-2">Projected FCF</th>
              <th className="text-right py-1.5 pl-2">Present Value</th>
            </tr>
          </thead>
          <tbody>
            {result.projectedFCFs.map((p) => (
              <tr key={p.year} className="border-b border-border/50">
                <td className="py-1.5 pr-2 text-text-secondary tabular-nums">
                  Year {p.year}
                </td>
                <td className="text-right py-1.5 px-2 tabular-nums">
                  {formatCompact(p.fcf)}
                </td>
                <td className="text-right py-1.5 pl-2 tabular-nums">
                  {formatCompact(p.presentValue)}
                </td>
              </tr>
            ))}
            <tr className="border-b border-border/50">
              <td className="py-1.5 pr-2 text-text-secondary">Terminal Value</td>
              <td className="text-right py-1.5 px-2 tabular-nums">
                {formatCompact(result.terminalValue)}
              </td>
              <td className="text-right py-1.5 pl-2 tabular-nums">
                {formatCompact(result.terminalValuePV)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td className="py-1.5 pr-2">Enterprise Value</td>
              <td className="text-right py-1.5 px-2 tabular-nums" colSpan={2}>
                {formatCompact(result.enterpriseValue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* (e) Sensitivity Table */}
      <div>
        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Sensitivity Analysis
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-1.5 px-1 text-left text-text-muted text-[10px]">
                  Growth \ WACC
                </th>
                {[-0.02, -0.01, 0, 0.01, 0.02].map((dOff) => (
                  <th
                    key={dOff}
                    className="py-1.5 px-1 text-center tabular-nums text-text-muted"
                  >
                    {formatPctInput(assumptions.discountRate + dOff)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[-0.02, -0.01, 0, 0.01, 0.02].map((gOff, rowIdx) => (
                <tr key={gOff} className="border-t border-border/50">
                  <td className="py-1.5 px-1 text-text-muted tabular-nums">
                    {formatPctInput(assumptions.growthRate + gOff)}
                  </td>
                  {[-0.02, -0.01, 0, 0.01, 0.02].map((dOff, colIdx) => {
                    const cell = sensitivityTable[rowIdx * 5 + colIdx];
                    const isCenter = gOff === 0 && dOff === 0;
                    const abovePrice =
                      cell.intrinsicValue > data.currentPrice;
                    const valid =
                      assumptions.discountRate + dOff >
                      assumptions.terminalGrowthRate;

                    return (
                      <td
                        key={dOff}
                        className={cn(
                          "py-1.5 px-1 text-center tabular-nums",
                          isCenter && "bg-accent/20 font-semibold",
                          valid
                            ? abovePrice
                              ? "text-gain"
                              : "text-loss"
                            : "text-text-muted"
                        )}
                      >
                        {valid ? formatDollar(cell.intrinsicValue) : "N/A"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* (f) Methodology */}
      <details className="text-xs text-text-muted">
        <summary className="cursor-pointer hover:text-text-secondary transition-colors">
          Methodology & Disclaimer
        </summary>
        <div className="mt-2 space-y-1">
          <p>
            This DCF model projects free cash flows forward using the assumed
            growth rate, then calculates a terminal value using the Gordon Growth
            Model. All future cash flows are discounted back to present value
            using the WACC (Weighted Average Cost of Capital).
          </p>
          <p>
            Enterprise Value = Sum of discounted FCFs + discounted Terminal Value.
            Equity Value = Enterprise Value - Net Debt. Intrinsic Value per Share
            = Equity Value / Shares Outstanding.
          </p>
          <p className="font-medium">
            This is a simplified model for educational purposes only. It should
            not be used as the sole basis for investment decisions. Always conduct
            thorough research and consider consulting a financial advisor.
          </p>
        </div>
      </details>
    </div>
  );
}

function AssumptionSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
  warning,
  isInteger,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  warning?: string;
  isInteger?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <label className="text-xs text-text-secondary">{label}</label>
          {hint && (
            <span className="ml-2 text-[10px] text-text-muted">({hint})</span>
          )}
        </div>
        <input
          type="text"
          value={format(value)}
          onChange={(e) => {
            const raw = e.target.value.replace("%", "");
            const parsed = parseFloat(raw);
            if (!isNaN(parsed)) {
              onChange(isInteger ? Math.round(parsed) : parsed / 100);
            }
          }}
          className="w-16 text-right bg-surface-3 rounded px-2 py-1 text-xs tabular-nums border border-border focus:border-accent outline-none"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(isInteger ? Math.round(v) : v);
        }}
        onInput={(e) => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          onChange(isInteger ? Math.round(v) : v);
        }}
        className="w-full accent-accent h-1.5"
      />
      {warning && (
        <span className="text-[10px] text-yellow-400">{warning}</span>
      )}
    </div>
  );
}

function HistoricalRow({
  label,
  values,
  highlightLast,
}: {
  label: string;
  values: (number | null)[];
  highlightLast?: boolean;
}) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-1.5 pr-2 text-text-secondary">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={cn(
            "text-right py-1.5 px-2 tabular-nums",
            highlightLast && i === values.length - 1 && "text-accent font-medium"
          )}
        >
          {v != null ? formatCompact(v) : "N/A"}
        </td>
      ))}
    </tr>
  );
}

function ValuationSkeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-surface-2 rounded-lg p-4">
        <div className="h-8 w-32 bg-surface-3 rounded animate-pulse mb-2" />
        <div className="h-5 w-24 bg-surface-3 rounded animate-pulse" />
      </div>
      <div className="bg-surface-2 rounded-lg p-4 space-y-4">
        <div className="h-3 w-28 bg-surface-3 rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 w-20 bg-surface-3 rounded animate-pulse mb-2" />
            <div className="h-1.5 w-full bg-surface-3 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div>
        <div className="h-3 w-32 bg-surface-3 rounded animate-pulse mb-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 w-full bg-surface-3 rounded animate-pulse mb-1" />
        ))}
      </div>
    </div>
  );
}

function formatDollar(value: number): string {
  if (!isFinite(value) || value < 0) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPctInput(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
