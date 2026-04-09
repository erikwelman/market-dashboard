"use client";

import { RefreshStatus } from "@/components/ui/refresh-status";
import { AlertBell } from "@/components/alerts/alert-bell";
import { useQuotes } from "@/hooks/use-quotes";
import { MARKET_OVERVIEW_INSTRUMENTS } from "@/lib/instruments";
import { formatPercent, cn } from "@/lib/utils";

export function Header() {
  const symbols = MARKET_OVERVIEW_INSTRUMENTS.map((i) => i.providerSymbol);
  const { data: quotes } = useQuotes(symbols);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Derive market state from the first equity/index quote
  const primaryQuote = quotes?.find((q) =>
    MARKET_OVERVIEW_INSTRUMENTS.some(
      (i) => i.providerSymbol === q.symbol && i.type !== "crypto"
    )
  );
  const marketState = primaryQuote?.marketState;
  const marketStateLabel = getMarketStateLabel(marketState);

  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Market Dashboard
          </h1>
          {marketStateLabel && (
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
                marketStateLabel.color
              )}
            >
              {marketStateLabel.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-text-muted">{today}</span>
          {quotes && quotes.length > 0 && (
            <MarketPulse quotes={quotes} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <AlertBell />
        <RefreshStatus />
      </div>
    </header>
  );
}

function MarketPulse({ quotes }: { quotes: { symbol: string; changePercent: number }[] }) {
  const pulseItems = MARKET_OVERVIEW_INSTRUMENTS.map((inst) => {
    const q = quotes.find((q) => q.symbol === inst.providerSymbol);
    if (!q) return null;
    const positive = q.changePercent >= 0;
    return (
      <span key={inst.providerSymbol} className="whitespace-nowrap">
        <span className="text-text-secondary">{inst.symbol}</span>{" "}
        <span className={positive ? "text-gain" : "text-loss"}>
          {formatPercent(q.changePercent)}
        </span>
      </span>
    );
  }).filter(Boolean);

  if (pulseItems.length === 0) return null;

  return (
    <span className="text-xs flex items-center gap-2">
      {pulseItems.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-muted">|</span>}
          {item}
        </span>
      ))}
    </span>
  );
}

function getMarketStateLabel(
  state: string | undefined
): { label: string; color: string } | null {
  if (!state) return null;
  switch (state) {
    case "REGULAR":
      return { label: "Market Open", color: "text-gain bg-gain-bg" };
    case "PRE":
      return { label: "Pre-Market", color: "text-accent bg-accent/10" };
    case "POST":
    case "POSTPOST":
      return { label: "After Hours", color: "text-accent bg-accent/10" };
    case "CLOSED":
      return { label: "Closed", color: "text-text-muted bg-surface-3" };
    case "PREPRE":
      return { label: "Pre-Market", color: "text-accent bg-accent/10" };
    default:
      return null;
  }
}
