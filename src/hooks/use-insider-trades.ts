"use client";

import { useQuery } from "@tanstack/react-query";
import type { InsiderTrade } from "@/lib/alert-types";

async function fetchInsiderTrades(symbol: string): Promise<InsiderTrade[]> {
  const res = await fetch(
    `/api/research/insider-trades?symbol=${encodeURIComponent(symbol)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch insider trades (${res.status})`);
  return res.json();
}

async function fetchInsiderFeed(
  symbols: string[],
  limit: number,
  types?: string[]
): Promise<InsiderTrade[]> {
  const params = new URLSearchParams();
  params.set("symbols", symbols.join(","));
  params.set("limit", String(limit));
  if (types && types.length > 0) params.set("type", types.join(","));
  const res = await fetch(`/api/research/insider-feed?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch insider feed (${res.status})`);
  return res.json();
}

export function useInsiderTrades(
  symbol?: string,
  options?: { symbols?: string[]; limit?: number; types?: string[] }
) {
  const symbols = options?.symbols ?? [];
  const limit = options?.limit ?? 50;
  const types = options?.types;

  return useQuery({
    queryKey: symbol
      ? ["insider-trades", symbol]
      : ["insider-feed", symbols, limit, types],
    queryFn: () =>
      symbol
        ? fetchInsiderTrades(symbol)
        : fetchInsiderFeed(symbols, limit, types),
    enabled: !!symbol || symbols.length > 0,
    staleTime: 30 * 60_000,
  });
}
