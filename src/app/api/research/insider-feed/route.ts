import { NextRequest, NextResponse } from "next/server";
import type { InsiderTrade } from "@/lib/alert-types";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json(
      { error: "symbols parameter required" },
      { status: 400 }
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  const typeParam = request.nextUrl.searchParams.get("type");
  const allowedTypes = typeParam
    ? typeParam.split(",").map((t) => t.trim().toUpperCase())
    : null;

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  }

  try {
    // Fetch insider trades for each symbol in parallel via internal API
    const baseUrl = request.nextUrl.origin;
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const url = `${baseUrl}/api/research/insider-trades?symbol=${encodeURIComponent(symbol)}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        return (await res.json()) as InsiderTrade[];
      })
    );

    let allTrades: InsiderTrade[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allTrades.push(...result.value);
      }
    }

    // Filter by type if specified
    if (allowedTypes) {
      allTrades = allTrades.filter((t) =>
        allowedTypes.includes(t.transactionType)
      );
    }

    // Sort by filing date desc
    allTrades.sort(
      (a, b) =>
        new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
    );

    // Limit results
    allTrades = allTrades.slice(0, limit);

    return NextResponse.json(allTrades, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Insider feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insider feed" },
      { status: 500 }
    );
  }
}
