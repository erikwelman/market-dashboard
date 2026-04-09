import { useQuery } from "@tanstack/react-query";
import type { PaperPortfolio } from "@/lib/alert-types";

interface DailyClose {
  date: string;
  close: number;
}

export interface PortfolioHistoryPoint {
  time: number;
  portfolioValue: number;
  benchmarkValue: number;
}

async function fetchPortfolioHistory(
  symbols: string[],
  benchmark: string,
  from: string
): Promise<Record<string, DailyClose[]>> {
  const params = new URLSearchParams({
    symbols: symbols.join(","),
    benchmark,
    from,
  });
  const res = await fetch(`/api/portfolio/history?${params}`);
  if (!res.ok)
    throw new Error(`Failed to fetch portfolio history (${res.status})`);
  return res.json();
}

function buildPortfolioTimeSeries(
  portfolio: PaperPortfolio,
  history: Record<string, DailyClose[]>
): PortfolioHistoryPoint[] {
  const benchmark = portfolio.benchmark;
  const benchmarkData = history[benchmark] ?? [];
  if (benchmarkData.length === 0) return [];

  // Collect all unique dates across all symbols
  const allDates = new Set<string>();
  for (const symbol of Object.keys(history)) {
    for (const entry of history[symbol]) {
      allDates.add(entry.date);
    }
  }
  const sortedDates = Array.from(allDates).sort();

  // Build price lookup maps
  const priceMap: Record<string, Record<string, number>> = {};
  for (const [symbol, data] of Object.entries(history)) {
    priceMap[symbol] = {};
    for (const entry of data) {
      priceMap[symbol][entry.date] = entry.close;
    }
  }

  // Preprocess transactions sorted by date
  const allTransactions = portfolio.positions
    .flatMap((p) => p.transactions)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Walk through dates, applying transactions as they occur
  const holdings: Record<string, number> = {};
  let txIndex = 0;

  const points: PortfolioHistoryPoint[] = [];
  let startPortfolioValue: number | null = null;
  let startBenchmarkValue: number | null = null;

  for (const date of sortedDates) {
    // Apply any transactions on or before this date
    while (
      txIndex < allTransactions.length &&
      allTransactions[txIndex].date <= date
    ) {
      const tx = allTransactions[txIndex];
      if (tx.type === "BUY") {
        holdings[tx.symbol] = (holdings[tx.symbol] ?? 0) + tx.shares;
      } else {
        holdings[tx.symbol] = (holdings[tx.symbol] ?? 0) - tx.shares;
      }
      txIndex++;
    }

    // Calculate portfolio value on this date
    let portfolioValue = 0;
    let hasAnyPrice = false;
    for (const [symbol, shares] of Object.entries(holdings)) {
      if (shares <= 0) continue;
      const price = priceMap[symbol]?.[date];
      if (price != null) {
        portfolioValue += shares * price;
        hasAnyPrice = true;
      }
    }

    const benchmarkPrice = priceMap[benchmark]?.[date];
    if (!hasAnyPrice || benchmarkPrice == null) continue;

    if (startPortfolioValue === null) {
      startPortfolioValue = portfolioValue;
      startBenchmarkValue = benchmarkPrice;
    }

    if (startPortfolioValue === 0 || startBenchmarkValue === null || startBenchmarkValue === 0) {
      continue;
    }

    const portfolioPctChange =
      ((portfolioValue - startPortfolioValue) / startPortfolioValue) * 100;
    const benchmarkPctChange =
      ((benchmarkPrice - startBenchmarkValue) / startBenchmarkValue) * 100;

    points.push({
      time: Math.floor(new Date(date).getTime() / 1000),
      portfolioValue: portfolioPctChange,
      benchmarkValue: benchmarkPctChange,
    });
  }

  return points;
}

export function usePortfolioHistory(portfolio: PaperPortfolio | null) {
  const symbols = portfolio?.positions.map((p) => p.symbol) ?? [];
  const benchmark = portfolio?.benchmark ?? "";
  const from = portfolio?.createdAt
    ? new Date(portfolio.createdAt).toISOString().split("T")[0]
    : "";

  const historyQuery = useQuery({
    queryKey: [
      "portfolio-history",
      portfolio?.id,
      [...symbols].sort().join(","),
      benchmark,
      from,
    ],
    queryFn: () => fetchPortfolioHistory(symbols, benchmark, from),
    enabled: !!portfolio && symbols.length > 0 && !!from,
    staleTime: 60 * 60_000,
  });

  const timeSeries =
    portfolio && historyQuery.data
      ? buildPortfolioTimeSeries(portfolio, historyQuery.data)
      : [];

  return {
    timeSeries,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
  };
}
