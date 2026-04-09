import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

interface DailyClose {
  date: string;
  close: number;
}

async function fetchDailyCloses(
  symbol: string,
  from: string
): Promise<DailyClose[]> {
  const result = await yf.chart(symbol, {
    period1: from,
    interval: "1d",
  });

  if (!result.quotes) return [];

  return result.quotes
    .filter((q) => q.close != null && q.date != null)
    .map((q) => ({
      date: new Date(q.date!).toISOString().split("T")[0],
      close: q.close!,
    }));
}

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  const benchmark = request.nextUrl.searchParams.get("benchmark");
  const from = request.nextUrl.searchParams.get("from");

  if (!symbols) {
    return NextResponse.json(
      { error: "symbols parameter required" },
      { status: 400 }
    );
  }
  if (!from) {
    return NextResponse.json(
      { error: "from parameter required" },
      { status: 400 }
    );
  }

  try {
    const symbolList = symbols
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const allSymbols = benchmark
      ? [...symbolList, benchmark]
      : symbolList;

    const results = await Promise.allSettled(
      allSymbols.map((s) => fetchDailyCloses(s, from))
    );

    const history: Record<string, DailyClose[]> = {};
    allSymbols.forEach((symbol, i) => {
      const result = results[i];
      if (result.status === "fulfilled") {
        history[symbol] = result.value;
      } else {
        history[symbol] = [];
      }
    });

    return NextResponse.json(history, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Portfolio history API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio history" },
      { status: 500 }
    );
  }
}
