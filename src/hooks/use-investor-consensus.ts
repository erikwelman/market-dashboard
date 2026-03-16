import { useQuery } from "@tanstack/react-query";
import type { ConsensusResult } from "@/lib/investor-data/types";

async function fetchConsensus(ciks: string[]): Promise<ConsensusResult> {
  const res = await fetch(
    `/api/investor/consensus?ciks=${ciks.join(",")}`
  );
  if (!res.ok) throw new Error(`Failed to fetch consensus (${res.status})`);
  return res.json();
}

export function useInvestorConsensus(ciks: string[]) {
  return useQuery({
    queryKey: ["investor-consensus", [...ciks].sort().join(",")],
    queryFn: () => fetchConsensus(ciks),
    enabled: ciks.length > 0,
    staleTime: 30 * 60_000,
  });
}
