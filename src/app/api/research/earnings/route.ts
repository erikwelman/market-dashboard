import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { EarningsData } from "@/lib/alert-types";

const yf = new YahooFinance();

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json(
      { error: "symbols parameter required" },
      { status: 400 }
    );
  }

  const symbolList = symbols.split(",").map((s) => s.trim()).filter(Boolean);

  try {
    const results = await Promise.allSettled(
      symbolList.map((symbol) => fetchEarningsForSymbol(symbol))
    );

    const earnings: EarningsData[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        earnings.push(result.value);
      }
    }

    return NextResponse.json(earnings, {
      headers: {
        "Cache-Control":
          "public, s-maxage=14400, stale-while-revalidate=28800",
      },
    });
  } catch (error) {
    console.error("Earnings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}

async function fetchEarningsForSymbol(
  symbol: string
): Promise<EarningsData | null> {
  try {
    const [summaryResult, quoteResult] = await Promise.allSettled([
      yf.quoteSummary(symbol, {
        modules: ["calendarEvents", "earnings"],
      }),
      yf.quote(symbol),
    ]);

    const summary =
      summaryResult.status === "fulfilled" ? summaryResult.value : null;
    const quote =
      quoteResult.status === "fulfilled" ? quoteResult.value : null;

    const companyName =
      quote?.shortName || quote?.longName || symbol;

    const calendarEvents = summary?.calendarEvents ?? {};
    const earningsModule = summary?.earnings ?? {};

    // Extract next earnings date from calendarEvents
    let nextEarningsDate: string | null = null;
    const earningsDates = (calendarEvents as Record<string, unknown>)
      .earnings as Record<string, unknown> | undefined;
    if (earningsDates) {
      const earningsDate =
        (earningsDates.earningsDate as Date[] | undefined)?.[0] ??
        (earningsDates.earningsDate as Date | undefined);
      if (earningsDate instanceof Date) {
        nextEarningsDate = earningsDate.toISOString().split("T")[0];
      } else if (typeof earningsDate === "string") {
        nextEarningsDate = earningsDate;
      }
    }

    // Extract earnings history from earnings module
    const earningsHistory: EarningsData["earningsHistory"] = [];

    const earningsChart = (earningsModule as Record<string, unknown>)
      .earningsChart as Record<string, unknown> | undefined;
    const quarterly = (earningsChart?.quarterly ??
      []) as Array<Record<string, unknown>>;

    for (const q of quarterly) {
      earningsHistory.push({
        quarter: (q.date as string) ?? "",
        date: (q.date as string) ?? "",
        epsEstimate: toNum(q.estimate),
        epsActual: toNum(q.actual),
        surprise:
          toNum(q.actual) != null && toNum(q.estimate) != null
            ? (toNum(q.actual)! - toNum(q.estimate)!)
            : null,
        surprisePct:
          toNum(q.actual) != null &&
          toNum(q.estimate) != null &&
          toNum(q.estimate) !== 0
            ? ((toNum(q.actual)! - toNum(q.estimate)!) /
                Math.abs(toNum(q.estimate)!)) *
              100
            : null,
        revenueEstimate: null,
        revenueActual: null,
      });
    }

    // Also try financialChart for revenue data
    const financialChart = (earningsModule as Record<string, unknown>)
      .financialsChart as Record<string, unknown> | undefined;
    const quarterlyRevenue = (financialChart?.quarterly ??
      []) as Array<Record<string, unknown>>;

    for (let i = 0; i < quarterlyRevenue.length && i < earningsHistory.length; i++) {
      const rev = quarterlyRevenue[i];
      earningsHistory[i].revenueActual = toNum(rev.revenue);
    }

    return {
      symbol,
      companyName,
      nextEarningsDate,
      earningsHistory,
    };
  } catch (error) {
    console.error(`Failed to fetch earnings for ${symbol}:`, error);
    return null;
  }
}

function toNum(val: unknown): number | null {
  if (val == null || typeof val !== "number" || !isFinite(val)) return null;
  return val;
}
