import { useQuery } from "@tanstack/react-query";
import type { InvestorSearchResult } from "@/lib/investor-data/types";

async function fetchInvestorSearch(
  query: string
): Promise<InvestorSearchResult[]> {
  const res = await fetch(
    `/api/investor/search?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error(`Failed to search investors (${res.status})`);
  return res.json();
}

export function useInvestorSearch(query: string) {
  return useQuery({
    queryKey: ["investor-search", query],
    queryFn: () => fetchInvestorSearch(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60_000,
  });
}
