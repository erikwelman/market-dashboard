"use client";

import { useState, useCallback, useEffect } from "react";
import { DEFAULT_INDICATORS, type ChartIndicators } from "@/lib/indicators";

const STORAGE_KEY = "market-dashboard-chart-indicators";

function loadPrefs(): ChartIndicators {
  if (typeof window === "undefined") return DEFAULT_INDICATORS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_INDICATORS, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return DEFAULT_INDICATORS;
}

function savePrefs(prefs: ChartIndicators) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}

export function useIndicatorPrefs() {
  const [prefs, setPrefs] = useState<ChartIndicators>(DEFAULT_INDICATORS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const toggle = useCallback((key: keyof ChartIndicators) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      savePrefs(next);
      return next;
    });
  }, []);

  return { prefs, toggle };
}
