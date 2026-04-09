"use client";

import { useFundamentals } from "@/hooks/use-fundamentals";
import { cn, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

interface FundamentalsPanelProps {
  symbol: string;
}

export function FundamentalsPanel({ symbol }: FundamentalsPanelProps) {
  const { data, isLoading, isError, refetch } = useFundamentals(symbol);

  if (isLoading) return <FundamentalsSkeleton />;
  if (isError) return <ErrorState message="Failed to load fundamentals" onRetry={refetch} />;
  if (!data) return <EmptyState message="No fundamental data available" />;

  return (
    <div className="space-y-5">
      {/* Sector / Industry tags */}
      {(data.sector || data.industry) && (
        <div className="flex flex-wrap gap-2">
          {data.sector && (
            <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-text-secondary">
              {data.sector}
            </span>
          )}
          {data.industry && (
            <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-text-secondary">
              {data.industry}
            </span>
          )}
        </div>
      )}

      {/* Valuation */}
      <MetricSection title="Valuation">
        <MetricRow label="Market Cap" value={formatMarketCap(data.marketCap)} />
        <MetricRow label="Enterprise Value" value={formatMarketCap(data.enterpriseValue)} />
        <MetricRow
          label="P/E Ratio"
          value={formatRatio(data.peRatio)}
          color={getPeColor(data.peRatio)}
        />
        <MetricRow label="Forward P/E" value={formatRatio(data.forwardPE)} />
        <MetricRow label="PEG Ratio" value={formatRatio(data.pegRatio)} />
        <MetricRow label="EV/EBITDA" value={formatRatio(data.evToEbitda)} />
        <MetricRow label="Price/Book" value={formatRatio(data.priceToBook)} />
        <MetricRow label="Price/Sales" value={formatRatio(data.priceToSales)} />
      </MetricSection>

      {/* Profitability */}
      <MetricSection title="Profitability">
        <MetricRow label="Gross Margin" value={formatMarginValue(data.grossMargin)} />
        <MetricRow label="Operating Margin" value={formatMarginValue(data.operatingMargin)} />
        <MetricRow label="Net Margin" value={formatMarginValue(data.netMargin)} />
        <MetricRow label="Return on Equity" value={formatMarginValue(data.returnOnEquity)} />
        <MetricRow label="Return on Assets" value={formatMarginValue(data.returnOnAssets)} />
        <MetricRow label="EPS" value={data.eps != null ? `$${data.eps.toFixed(2)}` : null} />
        <MetricRow label="Book Value" value={data.bookValue != null ? `$${data.bookValue.toFixed(2)}` : null} />
        <MetricRow label="Revenue/Share" value={data.revenuePerShare != null ? `$${data.revenuePerShare.toFixed(2)}` : null} />
      </MetricSection>

      {/* Financial Health */}
      <MetricSection title="Financial Health">
        <MetricRow
          label="Debt/Equity"
          value={formatRatio(data.debtToEquity)}
          color={getDebtColor(data.debtToEquity)}
        />
        <MetricRow label="Current Ratio" value={formatRatio(data.currentRatio)} />
        <MetricRow label="Quick Ratio" value={formatRatio(data.quickRatio)} />
      </MetricSection>

      {/* Dividends */}
      <MetricSection title="Dividends">
        <MetricRow
          label="Dividend Yield"
          value={formatMarginValue(data.dividendYield)}
          color={getDividendColor(data.dividendYield)}
        />
        <MetricRow label="Dividend Rate" value={data.dividendRate != null ? `$${data.dividendRate.toFixed(2)}` : null} />
        <MetricRow label="Payout Ratio" value={formatMarginValue(data.payoutRatio)} />
        <MetricRow label="Ex-Dividend Date" value={data.exDividendDate} />
      </MetricSection>

      {/* Growth */}
      <MetricSection title="Growth">
        <MetricRow label="Revenue Growth" value={formatMarginValue(data.revenueGrowth)} />
        <MetricRow label="Earnings Growth" value={formatMarginValue(data.earningsGrowth)} />
      </MetricSection>
    </div>
  );
}

function MetricSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | null;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
      <span className="text-xs text-text-secondary">{label}</span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          color ?? (value == null ? "text-text-muted" : "text-text-primary")
        )}
      >
        {value ?? "N/A"}
      </span>
    </div>
  );
}

function FundamentalsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-surface-3 rounded animate-pulse" />
        <div className="h-5 w-28 bg-surface-3 rounded animate-pulse" />
      </div>
      {[8, 8, 3, 4, 2].map((count, sectionIdx) => (
        <div key={sectionIdx}>
          <div className="h-3 w-24 bg-surface-3 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 border-b border-border/50"
              >
                <div className="h-3 w-16 bg-surface-3 rounded animate-pulse" />
                <div className="h-3 w-12 bg-surface-3 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatMarketCap(value: number | null): string | null {
  if (value == null || value === 0) return null;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return formatCurrency(value);
}

function formatRatio(value: number | null): string | null {
  if (value == null) return null;
  return value.toFixed(2);
}

function formatMarginValue(value: number | null): string | null {
  if (value == null) return null;
  // yahoo-finance2 returns margins as decimals (0.25 = 25%)
  const pct = Math.abs(value) < 1 ? value * 100 : value;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function getPeColor(pe: number | null): string | undefined {
  if (pe == null) return undefined;
  if (pe < 10) return "text-gain";
  if (pe > 40) return "text-yellow-400";
  return undefined;
}

function getDebtColor(de: number | null): string | undefined {
  if (de == null) return undefined;
  if (de > 500) return "text-loss"; // yahoo returns as percentage (200 = 2x)
  if (de > 200) return "text-yellow-400";
  return undefined;
}

function getDividendColor(dy: number | null): string | undefined {
  if (dy == null) return undefined;
  const pct = Math.abs(dy) < 1 ? dy * 100 : dy;
  if (pct > 4) return "text-accent";
  return undefined;
}
