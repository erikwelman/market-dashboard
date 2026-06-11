"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchFundamentals } from "./use-fundamentals";

// Same queryKey as useFundamentals so the cache is shared with the detail panel
export function useCompareFundamentals(symbols: string[]) {
  return useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ["fundamentals", symbol],
      queryFn: () => fetchFundamentals(symbol),
      staleTime: 60 * 60_000,
      retry: 1,
    })),
  });
}
