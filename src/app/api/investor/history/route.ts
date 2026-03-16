import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";

export async function GET(request: NextRequest) {
  const cik = request.nextUrl.searchParams.get("cik");
  if (!cik) {
    return NextResponse.json(
      { error: "cik parameter required" },
      { status: 400 }
    );
  }

  try {
    const provider = getInvestorProvider();
    const result = await provider.getInvestorFilingHistory(cik);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Investor history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch filing history" },
      { status: 500 }
    );
  }
}
