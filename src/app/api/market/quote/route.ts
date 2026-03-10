import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/market-data/registry";

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  try {
    const provider = getProvider();
    const quotes = await provider.getQuotes(symbols.split(","));
    return NextResponse.json(quotes, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Quote API error:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
