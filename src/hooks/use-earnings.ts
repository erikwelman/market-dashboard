import { useQuery } from "@tanstack/react-query";
import type { EarningsData } from "@/lib/alert-types";

async function fetchEarnings(symbols: string[]): Promise<EarningsData[]> {
  const res = await fetch(
    `/api/research/earnings?symbols=${symbols.join(",")}`
  );
  if (!res.ok) throw new Error(`Failed to fetch earnings (${res.status})`);
  return res.json();
}

export function useEarningsCalendar(symbols: string[]) {
  return useQuery({
    queryKey: ["earnings", [...symbols].sort().join(",")],
    queryFn: () => fetchEarnings(symbols),
    enabled: symbols.length > 0,
    staleTime: 4 * 60 * 60_000,
  });
}
