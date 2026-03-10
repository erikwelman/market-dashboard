import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/market-data/registry";
import { getRangeParams } from "@/lib/market-data/range-config";
import type { TimeRange } from "@/lib/market-data/types";

const VALID_RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "10Y", "MAX"];

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const range = request.nextUrl.searchParams.get("range") || "1M";

  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  try {
    const provider = getProvider();
    const data = await provider.getChartData(symbol, range as TimeRange);
    const { cacheTtl } = getRangeParams(range as TimeRange);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${cacheTtl}, stale-while-revalidate=${cacheTtl * 2}`,
      },
    });
  } catch (error) {
    console.error("Chart API error:", error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
