import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@/lib/market-data/types";

async function fetchNews(symbol: string, companyName?: string): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ symbol });
  if (companyName) params.set("companyName", companyName);
  const res = await fetch(`/api/market/news?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch news (${res.status})`);
  return res.json();
}

export function useNews(symbol: string, companyName?: string) {
  return useQuery({
    queryKey: ["news", symbol, companyName],
    queryFn: () => fetchNews(symbol, companyName),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  });
}
