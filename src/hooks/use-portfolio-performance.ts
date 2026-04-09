import { useQuery } from "@tanstack/react-query";
import type { PaperPortfolio } from "@/lib/alert-types";

export interface PortfolioQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface PositionPerformance {
  symbol: string;
  shares: number;
  avgCostBasis: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number;
}

export interface PortfolioPerformance {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: PositionPerformance[];
}

async function fetchPortfolioQuotes(
  symbols: string[]
): Promise<PortfolioQuote[]> {
  const res = await fetch(
    `/api/portfolio/quotes?symbols=${symbols.join(",")}`
  );
  if (!res.ok) throw new Error(`Failed to fetch portfolio quotes (${res.status})`);
  return res.json();
}

function calculatePerformance(
  portfolio: PaperPortfolio,
  quotes: PortfolioQuote[]
): PortfolioPerformance {
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  let totalValue = 0;
  let totalCost = 0;
  let totalDayChange = 0;

  const positions: PositionPerformance[] = portfolio.positions.map((pos) => {
    const quote = quoteMap.get(pos.symbol);
    const currentPrice = quote?.price ?? pos.avgCostBasis;
    const currentValue = pos.shares * currentPrice;
    const costBasis = pos.shares * pos.avgCostBasis;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    const dayChange = quote ? pos.shares * quote.change : 0;
    const dayChangePercent = quote?.changePercent ?? 0;

    totalValue += currentValue;
    totalCost += costBasis;
    totalDayChange += dayChange;

    return {
      symbol: pos.symbol,
      shares: pos.shares,
      avgCostBasis: pos.avgCostBasis,
      currentPrice,
      currentValue,
      costBasis,
      pnl,
      pnlPercent,
      dayChange,
      dayChangePercent,
      weight: 0, // calculated after totals
    };
  });

  // Calculate weights
  positions.forEach((p) => {
    p.weight = totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0;
  });

  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const dayChangePercent =
    totalValue - totalDayChange > 0
      ? (totalDayChange / (totalValue - totalDayChange)) * 100
      : 0;

  return {
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPercent,
    dayChange: totalDayChange,
    dayChangePercent,
    positions,
  };
}

export function usePortfolioPerformance(portfolio: PaperPortfolio | null) {
  const symbols = portfolio?.positions.map((p) => p.symbol) ?? [];

  const quotesQuery = useQuery({
    queryKey: ["portfolio-quotes", [...symbols].sort().join(",")],
    queryFn: () => fetchPortfolioQuotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const performance =
    portfolio && quotesQuery.data
      ? calculatePerformance(portfolio, quotesQuery.data)
      : null;

  return {
    performance,
    isLoading: quotesQuery.isLoading,
    isError: quotesQuery.isError,
    error: quotesQuery.error,
    refetch: quotesQuery.refetch,
  };
}
