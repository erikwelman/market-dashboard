import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";
import type { FilingAlert } from "@/lib/alert-types";

// Simple in-memory CUSIP-to-ticker cache
const cusipTickerCache = new Map<string, string | null>();

async function resolveCusipToTicker(
  cusip: string,
  companyName: string
): Promise<string | null> {
  if (cusipTickerCache.has(cusip)) {
    return cusipTickerCache.get(cusip) ?? null;
  }

  try {
    // Best-effort: search yahoo-finance2 by company name
    const yahooFinance = (await import("yahoo-finance2")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = await yahooFinance.search(companyName, {
      quotesCount: 3,
      newsCount: 0,
    });

    const quotes: Array<{ quoteType?: string; symbol?: string }> =
      results?.quotes ?? [];
    const quote = quotes.find(
      (q) => q.quoteType === "EQUITY" || q.quoteType === "ETF"
    );

    const symbol = quote?.symbol ?? null;
    cusipTickerCache.set(cusip, symbol);
    return symbol;
  } catch {
    cusipTickerCache.set(cusip, null);
    return null;
  }
}

function formatQuarter(reportDate: string): string {
  const d = new Date(reportDate);
  const month = d.getMonth(); // 0-indexed
  const year = d.getFullYear();
  if (month <= 2) return `Q4 ${year - 1}`;
  if (month <= 5) return `Q1 ${year}`;
  if (month <= 8) return `Q2 ${year}`;
  return `Q3 ${year}`;
}

export async function GET(request: NextRequest) {
  const ciks = request.nextUrl.searchParams.get("ciks");
  if (!ciks) {
    return NextResponse.json(
      { error: "ciks parameter required" },
      { status: 400 }
    );
  }

  const sinceParam = request.nextUrl.searchParams.get("since");
  const sinceDate = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const cikList = ciks
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (cikList.length === 0) {
    return NextResponse.json([], {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  }

  try {
    const provider = getInvestorProvider();
    const alerts: FilingAlert[] = [];

    const results = await Promise.allSettled(
      cikList.map(async (cik) => {
        const { name, filings } = await provider.getInvestorFilingHistory(cik);

        // Need at least 2 filings to diff
        if (filings.length < 2) return [];

        const latestFiling = filings[0];
        const previousFiling = filings[1];

        // Check if filing is within date range
        if (new Date(latestFiling.filingDate) < sinceDate) return [];

        const [currentHoldings, previousHoldings] = await Promise.all([
          provider.getInvestorHoldings(cik, latestFiling.accessionNumber),
          provider.getInvestorHoldings(cik, previousFiling.accessionNumber),
        ]);

        const prevMap = new Map(previousHoldings.map((h) => [h.cusip, h]));
        const currMap = new Map(currentHoldings.map((h) => [h.cusip, h]));
        const quarter = formatQuarter(latestFiling.reportDate);
        const filingAlerts: FilingAlert[] = [];

        // Check current holdings for NEW, INCREASED, DECREASED
        for (const curr of currentHoldings) {
          const prev = prevMap.get(curr.cusip);

          let changeType: FilingAlert["changeType"] | null = null;

          if (!prev) {
            changeType = "NEW_POSITION";
          } else {
            const shareDelta = curr.shares - prev.shares;
            const pctChange =
              prev.shares > 0 ? (shareDelta / prev.shares) * 100 : 100;

            if (pctChange > 25) {
              changeType = "INCREASED";
            } else if (pctChange < -25) {
              changeType = "DECREASED";
            }
          }

          if (changeType) {
            const symbol = await resolveCusipToTicker(
              curr.cusip,
              curr.nameOfIssuer
            );

            const previousShares = prev?.shares ?? null;
            const previousValue = prev?.value ?? null;
            const percentChange =
              previousShares != null && previousShares > 0
                ? ((curr.shares - previousShares) / previousShares) * 100
                : null;

            filingAlerts.push({
              id: `${cik}-${latestFiling.accessionNumber}-${curr.cusip}`,
              investorName: name,
              investorCik: cik,
              filingDate: latestFiling.filingDate,
              quarter,
              symbol,
              companyName: curr.nameOfIssuer,
              cusip: curr.cusip,
              changeType,
              previousShares,
              currentShares: curr.shares,
              previousValue,
              currentValue: curr.value,
              percentChange,
              read: false,
            });
          }
        }

        // Check for EXITED positions (in previous but not in current)
        for (const prev of previousHoldings) {
          if (!currMap.has(prev.cusip)) {
            const symbol = await resolveCusipToTicker(
              prev.cusip,
              prev.nameOfIssuer
            );

            filingAlerts.push({
              id: `${cik}-${latestFiling.accessionNumber}-${prev.cusip}-exited`,
              investorName: name,
              investorCik: cik,
              filingDate: latestFiling.filingDate,
              quarter,
              symbol,
              companyName: prev.nameOfIssuer,
              cusip: prev.cusip,
              changeType: "EXITED",
              previousShares: prev.shares,
              currentShares: 0,
              previousValue: prev.value,
              currentValue: 0,
              percentChange: -100,
              read: false,
            });
          }
        }

        return filingAlerts;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        alerts.push(...result.value);
      }
    }

    // Sort by filing date desc, then absolute dollar change desc
    alerts.sort((a, b) => {
      const dateCompare =
        new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime();
      if (dateCompare !== 0) return dateCompare;

      const aAbsChange = Math.abs(
        (a.currentValue ?? 0) - (a.previousValue ?? 0)
      );
      const bAbsChange = Math.abs(
        (b.currentValue ?? 0) - (b.previousValue ?? 0)
      );
      return bAbsChange - aAbsChange;
    });

    return NextResponse.json(alerts, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Filing alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch filing alerts" },
      { status: 500 }
    );
  }
}
