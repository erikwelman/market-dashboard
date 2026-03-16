import { useQuery } from "@tanstack/react-query";
import type {
  FilingSummary,
  Filing,
  Holding,
  PositionChange,
} from "@/lib/investor-data/types";

async function fetchLatestFiling(
  cik: string
): Promise<FilingSummary | null> {
  const res = await fetch(`/api/investor/filing?cik=${cik}`);
  if (!res.ok) throw new Error(`Failed to fetch filing (${res.status})`);
  return res.json();
}

async function fetchFilingHistory(
  cik: string
): Promise<{ name: string; filings: Filing[] }> {
  const res = await fetch(`/api/investor/history?cik=${cik}`);
  if (!res.ok) throw new Error(`Failed to fetch filing history (${res.status})`);
  return res.json();
}

async function fetchHoldings(
  cik: string,
  accession: string
): Promise<Holding[]> {
  const res = await fetch(
    `/api/investor/holdings?cik=${cik}&accession=${encodeURIComponent(accession)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch holdings (${res.status})`);
  return res.json();
}

async function fetchPositionChanges(
  cik: string,
  accession: string
): Promise<PositionChange[]> {
  const res = await fetch(
    `/api/investor/filing?cik=${cik}&accession=${encodeURIComponent(accession)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch position changes (${res.status})`);
  return res.json();
}

export function useLatestFiling(cik: string | null) {
  return useQuery({
    queryKey: ["investor-latest-filing", cik],
    queryFn: () => fetchLatestFiling(cik!),
    enabled: !!cik,
    staleTime: 30 * 60_000,
  });
}

export function useFilingHistory(cik: string | null) {
  return useQuery({
    queryKey: ["investor-filing-history", cik],
    queryFn: () => fetchFilingHistory(cik!),
    enabled: !!cik,
    staleTime: 30 * 60_000,
  });
}

export function useHoldings(cik: string | null, accession: string | null) {
  return useQuery({
    queryKey: ["investor-holdings", cik, accession],
    queryFn: () => fetchHoldings(cik!, accession!),
    enabled: !!cik && !!accession,
    staleTime: 60 * 60_000,
  });
}

export function usePositionChanges(
  cik: string | null,
  accession: string | null
) {
  return useQuery({
    queryKey: ["investor-position-changes", cik, accession],
    queryFn: () => fetchPositionChanges(cik!, accession!),
    enabled: !!cik && !!accession,
    staleTime: 60 * 60_000,
  });
}
