import type { TimeRange } from "./types";

interface RangeParams {
  period1: Date;
  interval: string;
  cacheTtl: number; // seconds
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

function startOfYear(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1);
}

export function getRangeParams(range: TimeRange): RangeParams {
  switch (range) {
    case "1D":
      return { period1: daysAgo(1), interval: "5m", cacheTtl: 60 };
    case "5D":
      return { period1: daysAgo(5), interval: "15m", cacheTtl: 60 };
    case "1M":
      return { period1: monthsAgo(1), interval: "1d", cacheTtl: 300 };
    case "6M":
      return { period1: monthsAgo(6), interval: "1d", cacheTtl: 300 };
    case "YTD":
      return { period1: startOfYear(), interval: "1d", cacheTtl: 300 };
    case "1Y":
      return { period1: yearsAgo(1), interval: "1wk", cacheTtl: 600 };
    case "5Y":
      return { period1: yearsAgo(5), interval: "1wk", cacheTtl: 1800 };
    case "10Y":
      return { period1: yearsAgo(10), interval: "1mo", cacheTtl: 3600 };
    case "MAX":
      return { period1: new Date("1970-01-01"), interval: "1mo", cacheTtl: 3600 };
  }
}

export const ALL_RANGES: TimeRange[] = [
  "1D",
  "5D",
  "1M",
  "6M",
  "YTD",
  "1Y",
  "5Y",
  "10Y",
  "MAX",
];
