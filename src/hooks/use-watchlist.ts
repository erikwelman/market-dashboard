"use client";

import { useState, useCallback, useEffect } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { DEFAULT_WATCHLIST } from "@/lib/instruments";

const STORAGE_KEY = "market-dashboard-watchlist";

function loadWatchlist(): Instrument[] {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return DEFAULT_WATCHLIST;
}

function saveWatchlist(instruments: Instrument[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instruments));
  } catch {
    // ignore quota errors
  }
}

export function useWatchlist() {
  const [instruments, setInstruments] = useState<Instrument[]>(DEFAULT_WATCHLIST);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInstruments(loadWatchlist());
    setLoaded(true);
  }, []);

  const addInstrument = useCallback((instrument: Instrument) => {
    setInstruments((prev) => {
      if (prev.some((i) => i.providerSymbol === instrument.providerSymbol)) {
        return prev;
      }
      const next = [...prev, instrument];
      saveWatchlist(next);
      return next;
    });
  }, []);

  const removeInstrument = useCallback((providerSymbol: string) => {
    setInstruments((prev) => {
      const next = prev.filter((i) => i.providerSymbol !== providerSymbol);
      saveWatchlist(next);
      return next;
    });
  }, []);

  return { instruments, addInstrument, removeInstrument, loaded };
}
