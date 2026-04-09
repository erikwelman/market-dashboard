"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { WatchlistAlert } from "@/lib/alert-types";
import type { Quote } from "@/lib/market-data/types";

const STORAGE_KEY = "market-dashboard-watchlist-alerts-v1";

function loadAlerts(): WatchlistAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WatchlistAlert[];
      // Migrate old alerts without action field
      return parsed.map((a) => ({
        ...a,
        action: a.action ?? "BUY",
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveAlerts(alerts: WatchlistAlert[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useWatchlistAlerts() {
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newlyTriggered, setNewlyTriggered] = useState<WatchlistAlert[]>([]);
  const prevTriggeredIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loaded = loadAlerts();
    setAlerts(loaded);
    // Seed the prevTriggeredIds with already-triggered alerts so we don't
    // fire toasts for alerts that were already triggered before page load
    prevTriggeredIds.current = new Set(
      loaded.filter((a) => a.triggered).map((a) => a.id)
    );
    setLoaded(true);
  }, []);

  const addAlert = useCallback(
    (alert: Omit<WatchlistAlert, "id" | "createdAt" | "triggered" | "active" | "read">) => {
      setAlerts((prev) => {
        const newAlert: WatchlistAlert = {
          ...alert,
          id: generateId(),
          createdAt: new Date().toISOString(),
          triggered: false,
          active: true,
          read: false,
        };
        const next = [...prev, newAlert];
        saveAlerts(next);
        return next;
      });
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAlerts(next);
      return next;
    });
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a
      );
      saveAlerts(next);
      return next;
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, read: true } : a
      );
      saveAlerts(next);
      return next;
    });
  }, []);

  const markAllTriggeredAsRead = useCallback(() => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.triggered && !a.read ? { ...a, read: true } : a
      );
      saveAlerts(next);
      return next;
    });
  }, []);

  const dismissNewlyTriggered = useCallback(() => {
    setNewlyTriggered([]);
  }, []);

  const checkAlerts = useCallback(
    (quotes: Quote[]) => {
      let triggered = false;
      const justTriggered: WatchlistAlert[] = [];

      setAlerts((prev) => {
        const next = prev.map((alert) => {
          if (!alert.active || alert.triggered) return alert;
          const quote = quotes.find((q) => q.symbol === alert.symbol);
          if (!quote) return alert;

          let shouldTrigger = false;
          switch (alert.type) {
            case "PRICE_ABOVE":
              shouldTrigger = quote.price >= alert.threshold;
              break;
            case "PRICE_BELOW":
              shouldTrigger = quote.price <= alert.threshold;
              break;
            case "PCT_CHANGE_UP":
              shouldTrigger = quote.changePercent >= alert.threshold;
              break;
            case "PCT_CHANGE_DOWN":
              shouldTrigger = quote.changePercent <= -alert.threshold;
              break;
          }

          if (shouldTrigger) {
            triggered = true;
            const updatedAlert: WatchlistAlert = {
              ...alert,
              triggered: true,
              triggeredAt: new Date().toISOString(),
              triggeredPrice: quote.price,
              read: false,
            };
            if (!prevTriggeredIds.current.has(alert.id)) {
              justTriggered.push(updatedAlert);
              prevTriggeredIds.current.add(alert.id);
            }
            return updatedAlert;
          }
          return alert;
        });
        if (triggered) saveAlerts(next);
        return next;
      });

      if (justTriggered.length > 0) {
        setNewlyTriggered((prev) => [...prev, ...justTriggered]);
      }

      return triggered;
    },
    []
  );

  return {
    alerts,
    loaded,
    newlyTriggered,
    addAlert,
    removeAlert,
    toggleAlert,
    markAsRead,
    markAllTriggeredAsRead,
    dismissNewlyTriggered,
    checkAlerts,
  };
}
