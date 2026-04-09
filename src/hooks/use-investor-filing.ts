import { useQuery, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  FilingSummary,
  Filing,
  Holding,
  PositionChange,
  DatedPositionChange,
} from "@/lib/investor-data/types";
import { reportDateToQuarter } from "@/lib/investor-data/quarters";

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
    retry: 3,
    retryDelay: (attempt) => Math.min(3000 * Math.pow(2, attempt), 20000),
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
    retry: 3,
    retryDelay: (attempt) => Math.min(3000 * Math.pow(2, attempt), 20000),
  });
}

/**
 * Fetch position changes for multiple recent quarters and merge them
 * with quarter labels, sorted newest to oldest.
 */
export function useMultiQuarterChanges(
  cik: string | null,
  filings: Filing[],
  quarterCount = 8
) {
  const filingsToFetch = filings.slice(0, quarterCount);

  const queries = useQueries({
    queries: filingsToFetch.map((f) => ({
      queryKey: ["investor-position-changes", cik, f.accessionNumber] as const,
      queryFn: () => fetchPositionChanges(cik!, f.accessionNumber),
      enabled: !!cik,
      staleTime: 60 * 60_000,
      retry: 3,
      retryDelay: (attempt: number) => Math.min(3000 * Math.pow(2, attempt), 20000),
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const allChanges: DatedPositionChange[] = useMemo(() => {
    const result: DatedPositionChange[] = [];
    for (let i = 0; i < filingsToFetch.length; i++) {
      const q = queries[i];
      const filing = filingsToFetch[i];
      if (q.data) {
        const quarter = reportDateToQuarter(filing.reportDate);
        for (const change of q.data) {
          if (change.changeType !== "UNCHANGED") {
            result.push({
              ...change,
              quarter,
              reportDate: filing.reportDate,
            });
          }
        }
      }
    }
    // Sort newest to oldest by reportDate, then by absolute value change
    result.sort((a, b) => {
      const dateCompare = b.reportDate.localeCompare(a.reportDate);
      if (dateCompare !== 0) return dateCompare;
      return Math.abs(b.valueChange) - Math.abs(a.valueChange);
    });
    return result;
  }, [queries, filingsToFetch]);

  const refetchAll = () => queries.forEach((q) => q.refetch());

  return { data: allChanges, isLoading, isError, refetch: refetchAll };
}
