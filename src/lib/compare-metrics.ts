import type { Fundamentals } from "./alert-types";

export interface CompareMetric {
  key: string;
  label: string;
  // Numeric value used for sorting, median, and heat coloring
  getValue: (f: Fundamentals) => number | null;
  // Display string; defaults to a numeric format when omitted
  formatValue: (f: Fundamentals) => string | null;
  // "low" = lower is better, "high" = higher is better, "none" = neutral
  betterDirection: "low" | "high" | "none";
  // Heat-color this column vs the peer median (only currency-neutral metrics)
  heat: boolean;
}

// yahoo-finance2 returns most margins/growth as decimals (0.25 = 25%) but
// occasionally as percents already — same heuristic as FundamentalsPanel
function asPercent(value: number | null): number | null {
  if (value == null) return null;
  return Math.abs(value) < 1 ? value * 100 : value;
}

function formatRatio(value: number | null): string | null {
  return value == null ? null : value.toFixed(2);
}

function formatPct(value: number | null, signed = false): string | null {
  if (value == null) return null;
  const sign = signed && value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatMarketCap(value: number | null): string | null {
  if (value == null || value === 0) return null;
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toFixed(0);
}

function impliedUpside(f: Fundamentals): number | null {
  if (f.targetMeanPrice == null || f.currentPrice == null || f.currentPrice === 0) {
    return null;
  }
  return ((f.targetMeanPrice - f.currentPrice) / f.currentPrice) * 100;
}

function fiftyTwoWeekPosition(f: Fundamentals): number | null {
  if (
    f.currentPrice == null ||
    f.fiftyTwoWeekHigh == null ||
    f.fiftyTwoWeekLow == null ||
    f.fiftyTwoWeekHigh <= f.fiftyTwoWeekLow
  ) {
    return null;
  }
  const pct =
    ((f.currentPrice - f.fiftyTwoWeekLow) /
      (f.fiftyTwoWeekHigh - f.fiftyTwoWeekLow)) *
    100;
  return Math.min(Math.max(pct, 0), 100);
}

function formatRecommendation(f: Fundamentals): string | null {
  if (!f.recommendationKey) return null;
  const label = f.recommendationKey
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return f.recommendationMean != null
    ? `${label} (${f.recommendationMean.toFixed(1)})`
    : label;
}

export const COMPARE_METRICS: CompareMetric[] = [
  {
    key: "marketCap",
    label: "Mkt Cap",
    getValue: (f) => (f.marketCap > 0 ? f.marketCap : null),
    formatValue: (f) => formatMarketCap(f.marketCap),
    betterDirection: "none",
    heat: false, // listing-currency value — not comparable across exchanges
  },
  {
    key: "peRatio",
    label: "P/E",
    getValue: (f) => f.peRatio,
    formatValue: (f) => formatRatio(f.peRatio),
    betterDirection: "low",
    heat: true,
  },
  {
    key: "forwardPE",
    label: "Fwd P/E",
    getValue: (f) => f.forwardPE,
    formatValue: (f) => formatRatio(f.forwardPE),
    betterDirection: "low",
    heat: true,
  },
  {
    key: "pegRatio",
    label: "PEG",
    getValue: (f) => f.pegRatio,
    formatValue: (f) => formatRatio(f.pegRatio),
    betterDirection: "low",
    heat: true,
  },
  {
    key: "evToEbitda",
    label: "EV/EBITDA",
    getValue: (f) => f.evToEbitda,
    formatValue: (f) => formatRatio(f.evToEbitda),
    betterDirection: "low",
    heat: true,
  },
  {
    key: "priceToSales",
    label: "P/S",
    getValue: (f) => f.priceToSales,
    formatValue: (f) => formatRatio(f.priceToSales),
    betterDirection: "low",
    heat: true,
  },
  {
    key: "grossMargin",
    label: "Gross Mgn",
    getValue: (f) => asPercent(f.grossMargin),
    formatValue: (f) => formatPct(asPercent(f.grossMargin)),
    betterDirection: "high",
    heat: true,
  },
  {
    key: "operatingMargin",
    label: "Op Mgn",
    getValue: (f) => asPercent(f.operatingMargin),
    formatValue: (f) => formatPct(asPercent(f.operatingMargin)),
    betterDirection: "high",
    heat: true,
  },
  {
    key: "returnOnEquity",
    label: "ROE",
    getValue: (f) => asPercent(f.returnOnEquity),
    formatValue: (f) => formatPct(asPercent(f.returnOnEquity)),
    betterDirection: "high",
    heat: true,
  },
  {
    key: "revenueGrowth",
    label: "Rev Growth",
    getValue: (f) => asPercent(f.revenueGrowth),
    formatValue: (f) => formatPct(asPercent(f.revenueGrowth), true),
    betterDirection: "high",
    heat: true,
  },
  {
    key: "earningsGrowth",
    label: "EPS Growth",
    getValue: (f) => asPercent(f.earningsGrowth),
    formatValue: (f) => formatPct(asPercent(f.earningsGrowth), true),
    betterDirection: "high",
    heat: true,
  },
  {
    key: "dividendYield",
    label: "Div Yield",
    getValue: (f) => asPercent(f.dividendYield),
    formatValue: (f) => formatPct(asPercent(f.dividendYield)),
    betterDirection: "high",
    heat: true,
  },
  {
    key: "debtToEquity",
    label: "D/E",
    // yahoo returns debt/equity as a percentage (200 = 2x)
    getValue: (f) => f.debtToEquity,
    formatValue: (f) => formatPct(f.debtToEquity),
    betterDirection: "low",
    heat: true,
  },
  {
    key: "fiftyTwoWeekPosition",
    label: "52W Pos",
    getValue: fiftyTwoWeekPosition,
    formatValue: (f) => formatPct(fiftyTwoWeekPosition(f)),
    betterDirection: "none",
    heat: false,
  },
  {
    key: "impliedUpside",
    label: "Tgt Upside",
    getValue: impliedUpside,
    formatValue: (f) => formatPct(impliedUpside(f), true),
    betterDirection: "high",
    heat: true,
  },
  {
    key: "recommendation",
    label: "Analyst Rec",
    // recommendationMean: 1 = strong buy ... 5 = sell
    getValue: (f) => f.recommendationMean,
    formatValue: formatRecommendation,
    betterDirection: "low",
    heat: false,
  },
  {
    key: "numberOfAnalystOpinions",
    label: "# Analysts",
    getValue: (f) => f.numberOfAnalystOpinions,
    formatValue: (f) =>
      f.numberOfAnalystOpinions == null ? null : String(f.numberOfAnalystOpinions),
    betterDirection: "none",
    heat: false,
  },
];

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

const HEAT_MAX_DEVIATION = 0.4; // cap relative deviation at ±40%
const HEAT_MAX_ALPHA = 0.22;

export function heatColor(
  value: number | null,
  medianValue: number | null,
  betterDirection: "low" | "high" | "none"
): string | undefined {
  if (
    value == null ||
    medianValue == null ||
    betterDirection === "none" ||
    Math.abs(medianValue) < 1e-9
  ) {
    return undefined;
  }
  const deviation = (value - medianValue) / Math.abs(medianValue);
  const clamped = Math.max(-HEAT_MAX_DEVIATION, Math.min(HEAT_MAX_DEVIATION, deviation));
  const good = betterDirection === "high" ? clamped > 0 : clamped < 0;
  const alpha = (Math.abs(clamped) / HEAT_MAX_DEVIATION) * HEAT_MAX_ALPHA;
  if (alpha < 0.02) return undefined;
  return good
    ? `rgba(0, 200, 83, ${alpha.toFixed(3)})`
    : `rgba(255, 23, 68, ${alpha.toFixed(3)})`;
}
