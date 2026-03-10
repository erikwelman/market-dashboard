import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/market-data/registry";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const provider = getProvider();
    const results = await provider.searchInstruments(query);
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
