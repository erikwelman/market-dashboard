"use client";

import Link from "next/link";
import { useFilingAlerts } from "@/hooks/use-filing-alerts";
import { useWatchlistAlerts } from "@/hooks/use-watchlist-alerts";
import { useInvestorWatchlist } from "@/hooks/use-investor-watchlist";

export function AlertBell() {
  const { investors } = useInvestorWatchlist();
  const ciks = investors.map((i) => i.cik);
  const { unreadCount: filingUnread } = useFilingAlerts(ciks);
  const { alerts: watchlistAlerts } = useWatchlistAlerts();

  const triggeredUnread = watchlistAlerts.filter(
    (a) => a.triggered && !a.read
  ).length;
  const totalUnread = filingUnread + triggeredUnread;

  return (
    <Link
      href="/alerts"
      className="relative text-text-muted hover:text-text-primary transition-colors p-1"
      title="Alerts"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-loss text-[10px] font-bold text-white px-1">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      )}
    </Link>
  );
}
