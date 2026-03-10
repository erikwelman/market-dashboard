import { useQuery } from "@tanstack/react-query";
import type { HistoricalPoint, TimeRange } from "@/lib/market-data/types";

async function fetchChartData(
  symbol: string,
  range: TimeRange
): Promise<HistoricalPoint[]> {
  const res = await fetch(
    `/api/market/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`
  );
  if (!res.ok) throw new Error("Failed to fetch chart data");
  return res.json();
}

function getStaleTime(range: TimeRange): number {
  switch (range) {
    case "1D":
    case "5D":
      return 60_000;
    case "1M":
    case "6M":
    case "YTD":
      return 5 * 60_000;
    default:
      return 30 * 60_000;
  }
}

export function useChartData(symbol: string | null, range: TimeRange) {
  return useQuery({
    queryKey: ["chart", symbol, range],
    queryFn: () => fetchChartData(symbol!, range),
    enabled: !!symbol,
    staleTime: getStaleTime(range),
  });
}
