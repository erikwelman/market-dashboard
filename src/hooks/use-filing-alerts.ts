"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FilingAlert } from "@/lib/alert-types";

const READ_STATE_KEY = "market-dashboard-filing-alerts-read-v1";

function loadReadState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(READ_STATE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return {};
}

function saveReadState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(READ_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

async function fetchFilingAlerts(ciks: string[], since?: string): Promise<FilingAlert[]> {
  const params = new URLSearchParams();
  params.set("ciks", ciks.join(","));
  if (since) params.set("since", since);
  const res = await fetch(`/api/investors/alerts?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch filing alerts (${res.status})`);
  return res.json();
}

export function useFilingAlerts(ciks: string[] = [], since?: string) {
  const [readState, setReadState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setReadState(loadReadState());
  }, []);

  const { data: alerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["filing-alerts", ciks, since],
    queryFn: () => fetchFilingAlerts(ciks, since),
    enabled: ciks.length > 0,
    staleTime: 30 * 60_000,
  });

  const alertsWithReadState = alerts.map((a) => ({
    ...a,
    read: readState[a.id] ?? false,
  }));

  const unreadCount = alertsWithReadState.filter((a) => !a.read).length;

  const markAsRead = useCallback(
    (id: string) => {
      setReadState((prev) => {
        const next = { ...prev, [id]: true };
        saveReadState(next);
        return next;
      });
    },
    []
  );

  const markAllAsRead = useCallback(() => {
    setReadState((prev) => {
      const next = { ...prev };
      for (const a of alerts) {
        next[a.id] = true;
      }
      saveReadState(next);
      return next;
    });
  }, [alerts]);

  return {
    alerts: alertsWithReadState,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markAsRead,
    markAllAsRead,
  };
}
