import { useQuery } from "@tanstack/react-query";
import type { Fundamentals } from "@/lib/alert-types";

async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const res = await fetch(`/api/instruments/fundamentals?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Failed to fetch fundamentals (${res.status})`);
  return res.json();
}

export function useFundamentals(symbol: string) {
  return useQuery({
    queryKey: ["fundamentals", symbol],
    queryFn: () => fetchFundamentals(symbol),
    enabled: !!symbol,
    staleTime: 60 * 60_000,
  });
}
