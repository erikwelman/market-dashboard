import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/market-data/registry";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const companyName = request.nextUrl.searchParams.get("companyName") ?? undefined;

  try {
    const provider = getProvider();
    const news = await provider.getNews(symbol, 4, companyName);
    return NextResponse.json(news, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
