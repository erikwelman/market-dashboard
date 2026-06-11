"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Instrument } from "@/lib/market-data/types";
import { useWatchlist } from "./use-watchlist";

const STORAGE_KEY = "market-dashboard-compare-symbols";

interface CompareStorage {
  extras: Instrument[];
  excluded: string[]; // providerSymbols hidden from the watchlist seed
}

const EMPTY: CompareStorage = { extras: [], excluded: [] };

function loadStorage(): CompareStorage {
  if (typeof window === "undefined") return EMPTY;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...EMPTY, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return EMPTY;
}

function saveStorage(value: CompareStorage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

// Compare set = watchlist equities + manually added extras - removed rows
export function useCompareSymbols() {
  const { instruments: watchlist, loaded: watchlistLoaded } = useWatchlist();
  const [storage, setStorage] = useState<CompareStorage>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStorage(loadStorage());
    setLoaded(true);
  }, []);

  const instruments = useMemo(() => {
    const excluded = new Set(storage.excluded);
    const fromWatchlist = watchlist.filter(
      (i) => i.type === "equity" && !excluded.has(i.providerSymbol)
    );
    const seen = new Set(fromWatchlist.map((i) => i.providerSymbol));
    const extras = storage.extras.filter(
      (i) => !excluded.has(i.providerSymbol) && !seen.has(i.providerSymbol)
    );
    return [...fromWatchlist, ...extras];
  }, [watchlist, storage]);

  const addInstrument = useCallback((instrument: Instrument) => {
    setStorage((prev) => {
      const next: CompareStorage = {
        extras: prev.extras.some((i) => i.providerSymbol === instrument.providerSymbol)
          ? prev.extras
          : [...prev.extras, instrument],
        excluded: prev.excluded.filter((s) => s !== instrument.providerSymbol),
      };
      saveStorage(next);
      return next;
    });
  }, []);

  const removeInstrument = useCallback((providerSymbol: string) => {
    setStorage((prev) => {
      const next: CompareStorage = {
        extras: prev.extras.filter((i) => i.providerSymbol !== providerSymbol),
        excluded: prev.excluded.includes(providerSymbol)
          ? prev.excluded
          : [...prev.excluded, providerSymbol],
      };
      saveStorage(next);
      return next;
    });
  }, []);

  return {
    instruments,
    addInstrument,
    removeInstrument,
    loaded: loaded && watchlistLoaded,
  };
}
