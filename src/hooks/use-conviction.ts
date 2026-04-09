import { useQuery } from "@tanstack/react-query";
import type { ConvictionData } from "@/lib/alert-types";

async function fetchConviction(
  symbol: string,
  ciks: string[]
): Promise<ConvictionData> {
  const params = new URLSearchParams({
    symbol,
    ciks: ciks.join(","),
  });
  const res = await fetch(`/api/investors/conviction?${params}`);
  if (!res.ok)
    throw new Error(`Failed to fetch conviction data (${res.status})`);
  return res.json();
}

export function useConviction(symbol: string, ciks: string[]) {
  return useQuery({
    queryKey: ["conviction", symbol, [...ciks].sort().join(",")],
    queryFn: () => fetchConviction(symbol, ciks),
    enabled: !!symbol && ciks.length > 0,
    staleTime: 60 * 60_000,
  });
}
