import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { DCFInputData, CashFlowYear, RevenueYear } from "@/lib/dcf-types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "symbol parameter required" },
      { status: 400 }
    );
  }

  try {
    const [quoteSummaryResult, cashFlowTS, financialsTS, riskFreeRateData] =
      await Promise.all([
        yf.quoteSummary(symbol, {
          modules: [
            "earningsTrend",
            "defaultKeyStatistics",
            "financialData",
            "summaryDetail",
          ],
        }),
        yf.fundamentalsTimeSeries(symbol, {
          period1: "2018-01-01",
          type: "annual",
          module: "cash-flow",
        }),
        yf.fundamentalsTimeSeries(symbol, {
          period1: "2018-01-01",
          type: "annual",
          module: "financials",
        }),
        fetchRiskFreeRate(),
      ]);

    const stats = quoteSummaryResult.defaultKeyStatistics ?? {};
    const financial = quoteSummaryResult.financialData ?? {};
    const summaryDetail = quoteSummaryResult.summaryDetail ?? {};

    // Extract cash flow history from fundamentalsTimeSeries
    let cashFlowHistory: CashFlowYear[] = (cashFlowTS as unknown as Record<string, unknown>[])
      .filter(
        (row) =>
          row.operatingCashFlow != null || row.freeCashFlow != null
      )
      .map((row) => {
        const r = row;
        const opCF = toNum(r, "operatingCashFlow") ?? 0;
        const capEx = toNum(r, "capitalExpenditure") ?? 0;
        const fcf = toNum(r, "freeCashFlow") ?? opCF + capEx;
        return {
          year: extractYear(r),
          operatingCashflow: opCF,
          capitalExpenditures: capEx,
          freeCashFlow: fcf,
        };
      });

    // Fallback: if fundamentalsTimeSeries returned no cash flow data,
    // use TTM figures from financialData (quoteSummary)
    if (cashFlowHistory.length === 0) {
      const ttmFCF = toNum(
        financial as Record<string, unknown>,
        "freeCashflow"
      );
      const ttmOpCF = toNum(
        financial as Record<string, unknown>,
        "operatingCashflow"
      );
      if (ttmFCF != null || ttmOpCF != null) {
        const opCF = ttmOpCF ?? 0;
        const fcf = ttmFCF ?? opCF;
        cashFlowHistory = [
          {
            year: new Date().getFullYear(),
            operatingCashflow: opCF,
            capitalExpenditures: opCF - fcf > 0 ? -(opCF - fcf) : 0,
            freeCashFlow: fcf,
          },
        ];
      }
    }

    // Extract revenue history from fundamentalsTimeSeries financials
    const revenueHistory: RevenueYear[] = (financialsTS as unknown as Record<string, unknown>[])
      .filter((row) => row.totalRevenue != null)
      .map((row) => ({
        year: extractYear(row),
        totalRevenue: toNum(row, "totalRevenue") ?? 0,
      }));

    // Analyst growth estimate from earningsTrend
    let analystGrowthEstimate: number | null = null;
    const earningsTrend = (
      quoteSummaryResult as Record<string, unknown>
    ).earningsTrend as { trend?: Record<string, unknown>[] } | undefined;
    if (earningsTrend?.trend) {
      const fiveYearTrend = earningsTrend.trend.find(
        (t) => t.period === "+5y"
      );
      if (fiveYearTrend) {
        const growth = fiveYearTrend.growth as
          | { raw?: number }
          | number
          | undefined;
        if (typeof growth === "number") {
          analystGrowthEstimate = growth;
        } else if (
          growth &&
          typeof growth === "object" &&
          growth.raw != null
        ) {
          analystGrowthEstimate = growth.raw;
        }
      }
    }

    // Interest expense and tax rate from fundamentalsTimeSeries financials
    let interestExpense: number | null = null;
    let taxRate = 0.21;
    const sortedFinancials = ([...financialsTS] as unknown as Record<string, unknown>[]).sort(
      (a, b) => extractYear(b) - extractYear(a)
    );
    for (const row of sortedFinancials) {
      const r = row;
      if (interestExpense == null && r.interestExpense != null) {
        interestExpense = toNum(r, "interestExpense");
      }
      if (r.pretaxIncome != null && r.taxProvision != null) {
        const preTax = toNum(r, "pretaxIncome");
        const tax = toNum(r, "taxProvision");
        if (preTax && preTax > 0 && tax != null) {
          taxRate = Math.max(0, Math.min(0.5, tax / preTax));
          break;
        }
      }
    }

    // Get current price from a quote call
    let currentPrice = 0;
    try {
      const quote = await yf.quote(symbol);
      currentPrice = quote?.regularMarketPrice ?? 0;
    } catch {
      // fallback
    }

    const data: DCFInputData = {
      currentPrice,
      marketCap:
        toNum(summaryDetail as Record<string, unknown>, "marketCap") ?? 0,
      sharesOutstanding:
        toNum(stats as Record<string, unknown>, "sharesOutstanding") ?? 0,
      beta: toNum(stats as Record<string, unknown>, "beta"),
      totalDebt:
        toNum(financial as Record<string, unknown>, "totalDebt") ?? 0,
      totalCash:
        toNum(financial as Record<string, unknown>, "totalCash") ?? 0,
      riskFreeRate: riskFreeRateData,
      cashFlowHistory,
      revenueHistory,
      analystGrowthEstimate,
      debtToEquity:
        toNum(financial as Record<string, unknown>, "debtToEquity"),
      interestExpense,
      taxRate,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("DCF data API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch DCF data" },
      { status: 500 }
    );
  }
}

async function fetchRiskFreeRate(): Promise<number> {
  try {
    const quote = await yf.quote("^TNX");
    if (quote?.regularMarketPrice) {
      return quote.regularMarketPrice / 100;
    }
  } catch {
    // fallback
  }
  return 0.04;
}

function toNum(obj: Record<string, unknown>, key: string): number | null {
  const val = obj[key];
  if (val == null || typeof val !== "number" || !isFinite(val)) return null;
  return val;
}

function extractYear(row: Record<string, unknown>): number {
  const date = row.date as Date | string | undefined;
  if (date instanceof Date) return date.getFullYear();
  if (typeof date === "string") return new Date(date).getFullYear();
  const endDate = row.endDate as Date | string | undefined;
  if (endDate instanceof Date) return endDate.getFullYear();
  if (typeof endDate === "string") return new Date(endDate).getFullYear();
  return 0;
}
