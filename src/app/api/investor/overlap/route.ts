import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";

export async function GET(request: NextRequest) {
  const cusip = request.nextUrl.searchParams.get("cusip");
  const ciks = request.nextUrl.searchParams.get("ciks");

  if (!cusip || !ciks) {
    return NextResponse.json(
      { error: "cusip and ciks parameters required" },
      { status: 400 }
    );
  }

  try {
    const provider = getInvestorProvider();
    const overlaps = await provider.getCompanyInvestorOverlap(
      cusip,
      ciks.split(",")
    );
    return NextResponse.json(overlaps, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Investor overlap error:", error);
    return NextResponse.json(
      { error: "Failed to fetch investor overlap" },
      { status: 500 }
    );
  }
}
