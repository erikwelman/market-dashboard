import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";
import { reportDateToQuarter } from "@/lib/investor-data/quarters";
import type { ConvictionData } from "@/lib/alert-types";
import type { Holding } from "@/lib/investor-data/types";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

// Cache symbol -> cusip mappings
const symbolToCusipCache = new Map<
  string,
  { cusips: string[]; cachedAt: number }
>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function resolveSymbolToCusips(symbol: string): Promise<string[]> {
  const cached = symbolToCusipCache.get(symbol.toUpperCase());
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.cusips;
  }
  // We'll collect cusips from actual holdings matching; return empty here
  return [];
}

function findMatchingHoldings(
  holdings: Holding[],
  symbol: string,
  knownCusips: Set<string>,
  companyName?: string
): Holding[] {
  return holdings.filter((h) => {
    // Match by known cusip
    if (knownCusips.has(h.cusip)) return true;
    // Match by issuer name containing the symbol or company name
    const issuerUpper = h.nameOfIssuer.toUpperCase();
    if (issuerUpper === symbol.toUpperCase()) return true;
    if (companyName && issuerUpper.includes(companyName.toUpperCase()))
      return true;
    return false;
  });
}

function computeTrend(
  quarterHistory: { shares: number }[]
): "INCREASING" | "DECREASING" | "STABLE" | "EXITED" {
  if (quarterHistory.length === 0) return "EXITED";

  const last = quarterHistory[quarterHistory.length - 1];
  if (last.shares === 0) return "EXITED";

  const recent = quarterHistory.slice(-4);
  if (recent.length < 2) return "STABLE";

  let increases = 0;
  let decreases = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].shares > recent[i - 1].shares) increases++;
    else if (recent[i].shares < recent[i - 1].shares) decreases++;
  }

  if (increases > decreases) return "INCREASING";
  if (decreases > increases) return "DECREASING";
  return "STABLE";
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "symbol parameter required" },
      { status: 400 }
    );
  }

  const ciks = request.nextUrl.searchParams.get("ciks");
  if (!ciks) {
    return NextResponse.json(
      { error: "ciks parameter required" },
      { status: 400 }
    );
  }

  const cikList = ciks.split(",").filter(Boolean);
  if (cikList.length === 0) {
    return NextResponse.json(
      { error: "at least one CIK required" },
      { status: 400 }
    );
  }

  try {
    // Resolve company name via Yahoo Finance
    let companyName = symbol;
    try {
      const searchResult = await yf.search(symbol);
      const match = searchResult.quotes?.find(
        (q) =>
          ("symbol" in q && typeof q.symbol === "string" && q.symbol.toUpperCase() === symbol.toUpperCase()) ||
          ("quoteType" in q && q.quoteType === "EQUITY")
      );
      if (match && "shortname" in match && match.shortname) {
        companyName = String(match.shortname);
      } else if (match && "longname" in match && match.longname) {
        companyName = String(match.longname);
      }
    } catch {
      // Keep symbol as company name
    }

    // Get known cusips from cache
    const knownCusips = new Set(await resolveSymbolToCusips(symbol));

    const provider = getInvestorProvider();

    const investorResults = await Promise.allSettled(
      cikList.map(async (cik) => {
        const { name, filings } = await provider.getInvestorFilingHistory(cik);
        if (filings.length === 0) return null;

        // Get holdings for each filing quarter
        const quarterHistory: {
          quarter: string;
          shares: number;
          value: number;
          portfolioWeight: number;
        }[] = [];

        // Process filings chronologically (oldest first)
        const sortedFilings = [...filings].reverse();

        for (const filing of sortedFilings) {
          const holdings = await provider.getInvestorHoldings(
            cik,
            filing.accessionNumber
          );

          // Find matching holdings for this stock
          const matches = findMatchingHoldings(
            holdings,
            symbol,
            knownCusips,
            companyName
          );

          // Collect newly discovered cusips
          for (const m of matches) {
            if (!knownCusips.has(m.cusip)) {
              knownCusips.add(m.cusip);
            }
          }

          const quarter = reportDateToQuarter(filing.reportDate);
          const totalShares = matches.reduce((sum, h) => sum + h.shares, 0);
          const totalValue = matches.reduce((sum, h) => sum + h.value, 0);

          // Compute portfolio weight: sum of matching holding weights, or compute from total portfolio
          let portfolioWeight = 0;
          if (matches.length > 0) {
            const totalPortfolioValue = holdings.reduce(
              (sum, h) => sum + h.value,
              0
            );
            portfolioWeight =
              totalPortfolioValue > 0
                ? (totalValue / totalPortfolioValue) * 100
                : 0;
          }

          if (totalShares > 0 || totalValue > 0) {
            quarterHistory.push({
              quarter,
              shares: totalShares,
              value: totalValue,
              portfolioWeight: Math.round(portfolioWeight * 100) / 100,
            });
          }
        }

        // Calculate metrics
        const totalQuartersHeld = quarterHistory.length;
        const isCurrentHolder =
          quarterHistory.length > 0 &&
          quarterHistory[quarterHistory.length - 1].shares > 0;

        // Current streak: consecutive quarters at end where held
        let currentStreak = 0;
        if (isCurrentHolder) {
          for (let i = quarterHistory.length - 1; i >= 0; i--) {
            if (quarterHistory[i].shares > 0) currentStreak++;
            else break;
          }
        }

        const trend = computeTrend(quarterHistory);

        return {
          name,
          cik,
          totalQuartersHeld,
          currentStreak,
          isCurrentHolder,
          trend,
          quarterHistory,
        };
      })
    );

    // Update cusip cache
    if (knownCusips.size > 0) {
      symbolToCusipCache.set(symbol.toUpperCase(), {
        cusips: Array.from(knownCusips),
        cachedAt: Date.now(),
      });
    }

    const investors: ConvictionData["investors"] = [];
    for (const result of investorResults) {
      if (result.status !== "fulfilled" || !result.value) continue;
      investors.push(result.value);
    }

    // Sort by total quarters held descending
    investors.sort((a, b) => b.totalQuartersHeld - a.totalQuartersHeld);

    const convictionData: ConvictionData = {
      symbol: symbol.toUpperCase(),
      companyName,
      investors,
    };

    return NextResponse.json(convictionData, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Conviction API error:", error);
    return NextResponse.json(
      { error: "Failed to compute conviction data" },
      { status: 500 }
    );
  }
}
