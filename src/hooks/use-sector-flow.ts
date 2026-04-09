import { useQuery } from "@tanstack/react-query";
import type { SectorFlow } from "@/lib/alert-types";

async function fetchSectorFlow(
  ciks: string[],
  quarter?: string
): Promise<SectorFlow> {
  const params = new URLSearchParams({ ciks: ciks.join(",") });
  if (quarter) params.set("quarter", quarter);
  const res = await fetch(`/api/investors/sector-flow?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch sector flow (${res.status})`);
  return res.json();
}

export function useSectorFlow(ciks: string[], quarter?: string) {
  return useQuery({
    queryKey: ["sector-flow", [...ciks].sort().join(","), quarter],
    queryFn: () => fetchSectorFlow(ciks, quarter),
    enabled: ciks.length > 0,
    staleTime: 60 * 60_000,
  });
}
