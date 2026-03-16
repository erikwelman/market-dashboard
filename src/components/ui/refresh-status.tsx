"use client";

import { useState, useEffect, useCallback } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

export function RefreshStatus() {
  const isFetching = useIsFetching();
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  // Track when fetches complete
  const wasFetching = useWasFetching(isFetching);
  useEffect(() => {
    if (wasFetching && isFetching === 0) {
      setLastUpdated(new Date());
    }
  }, [isFetching, wasFetching]);

  // Update relative time display every 15s
  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      {isFetching > 0 ? (
        <>
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span>Updating...</span>
        </>
      ) : lastUpdated ? (
        <>
          <span className="h-2 w-2 rounded-full bg-gain" />
          <span>Quotes as of {formatTime(lastUpdated)}</span>
        </>
      ) : null}
    </div>
  );
}

function useWasFetching(current: number): boolean {
  const [prev, setPrev] = useState(current);
  const wasFetching = prev > 0;
  useEffect(() => {
    setPrev(current);
  }, [current]);
  return wasFetching;
}
