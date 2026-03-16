import { useQuery } from "@tanstack/react-query";
import type { SearchResult } from "@/lib/market-data/types";

async function fetchSearch(query: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Failed to search (${res.status})`);
  return res.json();
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchSearch(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60_000,
  });
}
