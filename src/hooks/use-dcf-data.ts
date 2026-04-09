import { useQuery } from "@tanstack/react-query";
import type { DCFInputData } from "@/lib/dcf-types";

async function fetchDCFData(symbol: string): Promise<DCFInputData> {
  const res = await fetch(`/api/instruments/dcf-data?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Failed to fetch DCF data (${res.status})`);
  return res.json();
}

export function useDCFData(symbol: string) {
  return useQuery({
    queryKey: ["dcf-data", symbol],
    queryFn: () => fetchDCFData(symbol),
    enabled: !!symbol,
    staleTime: 60 * 60_000,
  });
}
