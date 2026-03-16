import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";

export async function GET(request: NextRequest) {
  const cik = request.nextUrl.searchParams.get("cik");
  const accession = request.nextUrl.searchParams.get("accession");

  if (!cik || !accession) {
    return NextResponse.json(
      { error: "cik and accession parameters required" },
      { status: 400 }
    );
  }

  try {
    const provider = getInvestorProvider();
    const holdings = await provider.getInvestorHoldings(cik, accession);
    return NextResponse.json(holdings, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Investor holdings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch holdings" },
      { status: 500 }
    );
  }
}
