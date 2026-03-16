"use client";

import { useState, useCallback, useEffect } from "react";
import type { TrackedInvestor } from "@/lib/investor-data/types";

const STORAGE_KEY = "market-dashboard-investor-watchlist";

function loadInvestorWatchlist(): TrackedInvestor[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveInvestorWatchlist(investors: TrackedInvestor[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(investors));
  } catch {
    // ignore quota errors
  }
}

export function useInvestorWatchlist() {
  const [investors, setInvestors] = useState<TrackedInvestor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInvestors(loadInvestorWatchlist());
    setLoaded(true);
  }, []);

  const addInvestor = useCallback((investor: TrackedInvestor) => {
    setInvestors((prev) => {
      if (prev.some((i) => i.cik === investor.cik)) return prev;
      const next = [...prev, investor];
      saveInvestorWatchlist(next);
      return next;
    });
  }, []);

  const removeInvestor = useCallback((cik: string) => {
    setInvestors((prev) => {
      const next = prev.filter((i) => i.cik !== cik);
      saveInvestorWatchlist(next);
      return next;
    });
  }, []);

  const reorderInvestors = useCallback((reordered: TrackedInvestor[]) => {
    setInvestors(reordered);
    saveInvestorWatchlist(reordered);
  }, []);

  return { investors, addInvestor, removeInvestor, reorderInvestors, loaded };
}
