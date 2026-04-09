"use client";

import type { WatchlistAlert } from "@/lib/alert-types";
import { formatCurrency, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

interface WatchlistAlertsListProps {
  alerts: WatchlistAlert[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

function formatCondition(alert: WatchlistAlert): string {
  switch (alert.type) {
    case "PRICE_ABOVE":
      return `above ${formatCurrency(alert.threshold)}`;
    case "PRICE_BELOW":
      return `below ${formatCurrency(alert.threshold)}`;
    case "PCT_CHANGE_UP":
      return `up ${alert.threshold}%`;
    case "PCT_CHANGE_DOWN":
      return `down ${alert.threshold}%`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function WatchlistAlertsList({
  alerts,
  onToggle,
  onRemove,
}: WatchlistAlertsListProps) {
  if (alerts.length === 0) {
    return <EmptyState message="No price alerts set" />;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-lg border transition-colors",
            alert.triggered
              ? "bg-gain-bg border-gain/20"
              : alert.active
                ? "bg-surface-2 border-border"
                : "bg-surface-2/50 border-border/50 opacity-60"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-text-primary">
              {alert.symbol}
            </span>
            <span className="text-xs text-text-secondary">
              {formatCondition(alert)}
            </span>
            {alert.triggered && (
              <span className="text-[10px] font-semibold text-gain bg-gain-bg px-1.5 py-0.5 rounded">
                TRIGGERED
              </span>
            )}
            {!alert.active && !alert.triggered && (
              <span className="text-[10px] text-text-muted">paused</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {alert.triggered && alert.triggeredAt && (
              <span className="text-[10px] text-text-muted">
                at {formatCurrency(alert.triggeredPrice ?? 0)} &middot;{" "}
                {formatDate(alert.triggeredAt)}
              </span>
            )}
            {!alert.triggered && (
              <span className="text-[10px] text-text-muted">
                {formatDate(alert.createdAt)}
              </span>
            )}
            <button
              onClick={() => onToggle(alert.id)}
              className="text-xs text-text-muted hover:text-text-primary transition-colors px-1"
              title={alert.active ? "Pause" : "Resume"}
            >
              {alert.active ? "||" : "▶"}
            </button>
            <button
              onClick={() => onRemove(alert.id)}
              className="text-text-muted hover:text-loss transition-colors text-sm px-1"
              title="Delete"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
