import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const provider = getInvestorProvider();
    const results = await provider.searchInvestors(query);
    return NextResponse.json(results, {
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Investor search error:", error);
    return NextResponse.json(
      { error: "Failed to search investors" },
      { status: 500 }
    );
  }
}
