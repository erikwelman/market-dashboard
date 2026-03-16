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

    // If accessionNumber is provided, return position changes for that filing
    const accessionNumber = request.nextUrl.searchParams.get("accession");
    if (accessionNumber) {
      const changes = await provider.getInvestorPositionChanges(
        cik,
        accessionNumber
      );
      return NextResponse.json(changes, {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      });
    }

    // Otherwise return the latest filing summary
    const summary = await provider.getInvestorLatestFiling(cik);
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Investor filing error:", error);
    return NextResponse.json(
      { error: "Failed to fetch filing data" },
      { status: 500 }
    );
  }
}
