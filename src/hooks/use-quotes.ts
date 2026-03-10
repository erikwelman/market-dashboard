import { useQuery } from "@tanstack/react-query";
import type { Quote } from "@/lib/market-data/types";

async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const res = await fetch(`/api/market/quote?symbols=${symbols.join(",")}`);
  if (!res.ok) throw new Error("Failed to fetch quotes");
  return res.json();
}

export function useQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ["quotes", symbols.sort().join(",")],
    queryFn: () => fetchQuotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
