"use client";

import { useState, useMemo } from "react";
import type { Instrument } from "@/lib/market-data/types";
import type { FilingAlert, WatchlistAlert } from "@/lib/alert-types";
import { useFilingAlerts } from "@/hooks/use-filing-alerts";
import { useWatchlistAlerts } from "@/hooks/use-watchlist-alerts";
import { useInvestorWatchlist } from "@/hooks/use-investor-watchlist";
import { cn, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";

type TabFilter = "all" | "13f" | "price";

interface AlertFeedProps {
  onSelectInstrument: (instrument: Instrument) => void;
}

export function AlertFeed({ onSelectInstrument }: AlertFeedProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const { investors } = useInvestorWatchlist();
  const ciks = useMemo(() => investors.map((i) => i.cik), [investors]);

  const {
    alerts: filingAlerts,
    isLoading: filingLoading,
    isError: filingError,
    markAsRead: markFilingRead,
    markAllAsRead: markAllFilingRead,
    unreadCount: filingUnread,
  } = useFilingAlerts(ciks);

  const {
    alerts: watchlistAlerts,
    markAsRead: markWatchlistRead,
  } = useWatchlistAlerts();

  const triggeredWatchlistAlerts = watchlistAlerts.filter((a) => a.triggered);
  const watchlistUnread = triggeredWatchlistAlerts.filter(
    (a) => !a.read
  ).length;
  const totalUnread = filingUnread + watchlistUnread;

  const handleMarkAllRead = () => {
    markAllFilingRead();
    triggeredWatchlistAlerts.forEach((a) => {
      if (!a.read) markWatchlistRead(a.id);
    });
  };

  const handleFilingAlertClick = (alert: FilingAlert) => {
    markFilingRead(alert.id);
    if (alert.symbol) {
      onSelectInstrument({
        symbol: alert.symbol,
        providerSymbol: alert.symbol,
        name: alert.companyName,
        type: "equity",
      });
    }
  };

  const handleWatchlistAlertClick = (alert: WatchlistAlert) => {
    markWatchlistRead(alert.id);
    onSelectInstrument({
      symbol: alert.symbol,
      providerSymbol: alert.symbol,
      name: alert.symbol,
      type: "equity",
    });
  };

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    {
      key: "all",
      label: "All",
      count: filingAlerts.length + triggeredWatchlistAlerts.length,
    },
    { key: "13f", label: "13F Changes", count: filingAlerts.length },
    {
      key: "price",
      label: "Price Alerts",
      count: triggeredWatchlistAlerts.length,
    },
  ];

  const isLoading = filingLoading;

  return (
    <div className="bg-surface-1 border border-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Alerts</h3>
          {totalUnread > 0 && (
            <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-loss text-[10px] font-bold text-white px-1.5">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
        {totalUnread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 -mb-[1px] transition-colors",
              activeTab === tab.key
                ? "text-accent border-accent"
                : "text-text-muted border-transparent hover:text-text-secondary"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-text-muted">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <AlertFeedSkeleton />
        ) : (
          <>
            {/* 13F Filing Alerts */}
            {(activeTab === "all" || activeTab === "13f") &&
              filingAlerts.map((alert) => (
                <FilingAlertCard
                  key={alert.id}
                  alert={alert}
                  onClick={() => handleFilingAlertClick(alert)}
                />
              ))}

            {/* Price Alerts */}
            {(activeTab === "all" || activeTab === "price") &&
              triggeredWatchlistAlerts.map((alert) => (
                <WatchlistAlertCard
                  key={alert.id}
                  alert={alert}
                  onClick={() => handleWatchlistAlertClick(alert)}
                />
              ))}

            {/* Empty State */}
            {!isLoading &&
              ((activeTab === "all" &&
                filingAlerts.length === 0 &&
                triggeredWatchlistAlerts.length === 0) ||
                (activeTab === "13f" && filingAlerts.length === 0) ||
                (activeTab === "price" &&
                  triggeredWatchlistAlerts.length === 0)) && (
                <div className="flex items-center justify-center py-12 text-text-muted text-sm">
                  {activeTab === "13f" && ciks.length === 0
                    ? "Add investors to your watchlist to see 13F change alerts"
                    : "No alerts to show"}
                </div>
              )}

            {/* Error State */}
            {filingError && activeTab !== "price" && (
              <div className="flex items-center justify-center py-8 text-text-secondary text-sm">
                Failed to load filing alerts
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function changeTypeBadge(changeType: FilingAlert["changeType"]) {
  const config = {
    NEW_POSITION: { label: "New", className: "text-gain bg-gain-bg" },
    EXITED: { label: "Exited", className: "text-loss bg-loss-bg" },
    INCREASED: { label: "Increased", className: "text-gain bg-gain-bg" },
    DECREASED: { label: "Decreased", className: "text-loss bg-loss-bg" },
  };
  const { label, className } = config[changeType];
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase",
        className
      )}
    >
      {label}
    </span>
  );
}

function FilingAlertCard({
  alert,
  onClick,
}: {
  alert: FilingAlert;
  onClick: () => void;
}) {
  const valueChange =
    (alert.currentValue ?? 0) - (alert.previousValue ?? 0);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-surface-2/50 transition-colors",
        !alert.read && "bg-surface-2/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {!alert.read && (
            <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
          )}
          <span className="text-xs font-medium text-text-secondary truncate">
            {alert.investorName}
          </span>
        </div>
        {changeTypeBadge(alert.changeType)}
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        {alert.symbol && (
          <span className="text-sm font-semibold text-accent">
            {alert.symbol}
          </span>
        )}
        <span className="text-xs text-text-secondary truncate">
          {alert.companyName}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted tabular-nums">
          {alert.currentShares != null && (
            <span>
              {formatNumber(alert.currentShares)} shares
            </span>
          )}
          {valueChange !== 0 && (
            <span
              className={cn(
                valueChange > 0 ? "text-gain" : "text-loss"
              )}
            >
              {formatCurrency(valueChange, "USD", true)}
            </span>
          )}
          {alert.percentChange != null && alert.changeType !== "NEW_POSITION" && alert.changeType !== "EXITED" && (
            <span
              className={cn(
                alert.percentChange > 0 ? "text-gain" : "text-loss"
              )}
            >
              {formatPercent(alert.percentChange)}
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-muted">
          {alert.quarter} &middot; {alert.filingDate}
        </span>
      </div>
    </button>
  );
}

function WatchlistAlertCard({
  alert,
  onClick,
}: {
  alert: WatchlistAlert;
  onClick: () => void;
}) {
  const typeLabel = {
    PRICE_ABOVE: "Price Above",
    PRICE_BELOW: "Price Below",
    PCT_CHANGE_UP: "Up",
    PCT_CHANGE_DOWN: "Down",
  };

  const isPrice =
    alert.type === "PRICE_ABOVE" || alert.type === "PRICE_BELOW";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-surface-2/50 transition-colors",
        !alert.read && "bg-surface-2/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          {!alert.read && (
            <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
          )}
          <span className="text-sm font-semibold text-accent">
            {alert.symbol}
          </span>
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase",
            alert.action === "SELL"
              ? "text-loss bg-loss-bg"
              : "text-gain bg-gain-bg"
          )}
        >
          {alert.action ?? "BUY"}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>
          {typeLabel[alert.type]}{" "}
          {isPrice
            ? formatCurrency(alert.threshold)
            : `${alert.threshold}%`}
        </span>
        {alert.triggeredPrice != null && (
          <span className="tabular-nums">
            Triggered at {formatCurrency(alert.triggeredPrice)}
          </span>
        )}
      </div>
      {alert.triggeredAt && (
        <div className="text-[10px] text-text-muted mt-1">
          {new Date(alert.triggeredAt).toLocaleDateString()}
        </div>
      )}
    </button>
  );
}

function AlertFeedSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-32 bg-surface-3 rounded" />
            <div className="h-4 w-16 bg-surface-3 rounded" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-12 bg-surface-3 rounded" />
            <div className="h-3 w-40 bg-surface-3 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-surface-3 rounded" />
            <div className="h-3 w-20 bg-surface-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
