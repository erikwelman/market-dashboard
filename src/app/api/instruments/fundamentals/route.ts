import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { Fundamentals } from "@/lib/alert-types";

const yf = new YahooFinance();

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "symbol parameter required" },
      { status: 400 }
    );
  }

  try {
    const result = await yf.quoteSummary(symbol, {
      modules: [
        "defaultKeyStatistics",
        "financialData",
        "summaryDetail",
        "summaryProfile",
      ],
    });

    const stats = result.defaultKeyStatistics ?? {};
    const financial = result.financialData ?? {};
    const summary = result.summaryDetail ?? {};
    const profile = result.summaryProfile ?? {};

    const fundamentals: Fundamentals = {
      symbol,
      companyName:
        (profile as Record<string, unknown>).longBusinessSummary != null
          ? symbol
          : symbol,
      sector: (profile as Record<string, unknown>).sector as string ?? "",
      industry: (profile as Record<string, unknown>).industry as string ?? "",
      marketCap: toNum(summary, "marketCap") ?? 0,
      enterpriseValue: toNum(stats, "enterpriseValue") ?? 0,
      peRatio: toNum(summary, "trailingPE"),
      forwardPE: toNum(stats, "forwardPE") ?? toNum(summary, "forwardPE"),
      pegRatio: toNum(stats, "pegRatio"),
      evToEbitda: toNum(stats, "enterpriseToEbitda"),
      priceToBook: toNum(stats, "priceToBook"),
      priceToSales: toNum(stats, "priceToSalesTrailing12Months"),
      grossMargin: toNum(financial, "grossMargins"),
      operatingMargin: toNum(financial, "operatingMargins"),
      netMargin: toNum(financial, "profitMargins"),
      returnOnEquity: toNum(financial, "returnOnEquity"),
      returnOnAssets: toNum(financial, "returnOnAssets"),
      debtToEquity: toNum(financial, "debtToEquity"),
      currentRatio: toNum(financial, "currentRatio"),
      quickRatio: toNum(financial, "quickRatio"),
      dividendYield: toNum(summary, "dividendYield"),
      dividendRate: toNum(summary, "dividendRate"),
      payoutRatio: toNum(summary, "payoutRatio"),
      exDividendDate: toDate(summary, "exDividendDate"),
      revenueGrowth: toNum(financial, "revenueGrowth"),
      earningsGrowth: toNum(financial, "earningsGrowth"),
      eps: toNum(stats, "trailingEps"),
      bookValue: toNum(stats, "bookValue"),
      revenuePerShare: toNum(financial, "revenuePerShare"),
    };

    // Try to get the company name from a quote call
    try {
      const quote = await yf.quote(symbol);
      if (quote?.shortName || quote?.longName) {
        fundamentals.companyName =
          quote.shortName || quote.longName || symbol;
      }
    } catch {
      // Use symbol as fallback
    }

    return NextResponse.json(fundamentals, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Fundamentals API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fundamentals" },
      { status: 500 }
    );
  }
}

function toNum(obj: Record<string, unknown>, key: string): number | null {
  const val = obj[key];
  if (val == null || typeof val !== "number" || !isFinite(val)) return null;
  return val;
}

function toDate(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key];
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "string") return val;
  if (typeof val === "number")
    return new Date(val * 1000).toISOString().split("T")[0];
  return null;
}
