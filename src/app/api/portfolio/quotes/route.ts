import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/market-data/registry";

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json(
      { error: "symbols parameter required" },
      { status: 400 }
    );
  }

  try {
    const provider = getProvider();
    const symbolList = symbols
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (symbolList.length === 0) {
      return NextResponse.json(
        { error: "At least one symbol required" },
        { status: 400 }
      );
    }

    const quotes = await provider.getQuotes(symbolList);

    const result = quotes.map((q) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      currency: q.currency,
    }));

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Portfolio quotes API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio quotes" },
      { status: 500 }
    );
  }
}
