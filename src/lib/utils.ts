import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number,
  currency = "USD",
  compact = false
): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function computeRangeChange(
  chartData: { value: number }[] | undefined,
  quote: { change: number; changePercent: number } | undefined,
  range: string
): { change: number; changePercent: number } {
  const defaultChange = quote?.change ?? 0;
  const defaultPercent = quote?.changePercent ?? 0;
  if (range !== "1D" && chartData && chartData.length >= 2) {
    const firstValue = chartData[0].value;
    const lastValue = chartData[chartData.length - 1].value;
    return {
      changePercent: ((lastValue - firstValue) / firstValue) * 100,
      change: lastValue - firstValue,
    };
  }
  return { change: defaultChange, changePercent: defaultPercent };
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}
