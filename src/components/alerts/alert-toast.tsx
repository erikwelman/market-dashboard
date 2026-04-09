"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WatchlistAlert } from "@/lib/alert-types";
import { formatCurrency, cn } from "@/lib/utils";

interface AlertToastProps {
  alerts: WatchlistAlert[];
  onDismiss: () => void;
}

export function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alerts.length > 0) {
      // Trigger enter animation
      requestAnimationFrame(() => setVisible(true));

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [alerts, onDismiss]);

  if (alerts.length === 0) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={cn(
        "fixed top-6 right-6 z-[60] max-w-sm w-full transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4 pointer-events-none"
      )}
    >
      <div className="bg-surface-1 border border-border rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-2/50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold text-text-primary">
              New Alert{alerts.length > 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-muted hover:text-text-primary text-sm transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "px-4 py-2.5 border-b border-border/30 last:border-b-0",
                alert.action === "BUY" ? "bg-gain/5" : "bg-loss/5"
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-semibold text-text-primary">
                  {alert.symbol}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                    alert.action === "BUY"
                      ? "text-gain bg-gain/15"
                      : "text-loss bg-loss/15"
                  )}
                >
                  {alert.action}
                </span>
              </div>
              <div className="text-xs text-text-secondary">
                Target {formatCurrency(alert.threshold)} reached
                {alert.triggeredPrice != null && (
                  <span className="text-text-muted">
                    {" "}&middot; Now at {formatCurrency(alert.triggeredPrice)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/alerts"
          onClick={handleDismiss}
          className="block px-4 py-2 text-center text-xs font-medium text-accent hover:bg-surface-2/50 transition-colors"
        >
          View All Alerts
        </Link>
      </div>
    </div>
  );
}
