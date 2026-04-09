"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useWatchlistAlerts } from "@/hooks/use-watchlist-alerts";
import { useQuotes } from "@/hooks/use-quotes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/smart-money", label: "Smart Money" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/research", label: "Research" },
  { href: "/alerts", label: "Alerts" },
];

export function Navigation() {
  const pathname = usePathname();
  const { alerts } = useWatchlistAlerts();

  // Fetch live quotes for all active alert symbols
  const activeSymbols = useMemo(
    () => [...new Set(alerts.filter((a) => a.active).map((a) => a.symbol))],
    [alerts]
  );
  const { data: quotes } = useQuotes(activeSymbols);

  // Count alerts whose conditions are currently met
  const currentlyTriggeredCount = useMemo(() => {
    if (!quotes || quotes.length === 0) return 0;
    let count = 0;
    for (const alert of alerts) {
      if (!alert.active) continue;
      const quote = quotes.find((q) => q.symbol === alert.symbol);
      if (!quote) continue;
      let met = false;
      switch (alert.type) {
        case "PRICE_ABOVE":
          met = quote.price >= alert.threshold;
          break;
        case "PRICE_BELOW":
          met = quote.price <= alert.threshold;
          break;
        case "PCT_CHANGE_UP":
          met = quote.changePercent >= alert.threshold;
          break;
        case "PCT_CHANGE_DOWN":
          met = quote.changePercent <= -alert.threshold;
          break;
      }
      if (met) count++;
    }
    return count;
  }, [alerts, quotes]);

  const isOnAlertsPage = pathname.startsWith("/alerts");

  return (
    <nav className="flex items-center gap-1 border-b border-border mb-6">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        const showBadge =
          item.href === "/alerts" && currentlyTriggeredCount > 0 && !isOnAlertsPage;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]",
              isActive
                ? "text-accent border-accent"
                : "text-text-secondary border-transparent hover:text-text-primary"
            )}
          >
            {item.label}
            {showBadge && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-loss text-[9px] font-bold text-white px-1">
                {currentlyTriggeredCount > 99 ? "99+" : currentlyTriggeredCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
