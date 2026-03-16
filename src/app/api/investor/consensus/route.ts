import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";
import type {
  StockConsensus,
  ConsensusResult,
} from "@/lib/investor-data/types";

export async function GET(request: NextRequest) {
  const ciks = request.nextUrl.searchParams.get("ciks");
  if (!ciks) {
    return NextResponse.json(
      { error: "ciks parameter required" },
      { status: 400 }
    );
  }

  const cikList = ciks.split(",").filter(Boolean);
  if (cikList.length === 0) {
    return NextResponse.json(
      { error: "at least one CIK required" },
      { status: 400 }
    );
  }

  try {
    const provider = getInvestorProvider();

    // For each tracked investor, get their latest filing's position changes
    const allChanges = await Promise.allSettled(
      cikList.map(async (cik) => {
        const { filings } = await provider.getInvestorFilingHistory(cik);
        if (filings.length < 2) return null; // need two filings to compare

        const latest = filings[0];
        const changes = await provider.getInvestorPositionChanges(
          cik,
          latest.accessionNumber
        );
        return changes;
      })
    );

    // Aggregate by CUSIP
    const stockMap = new Map<
      string,
      {
        companyName: string;
        investorsNew: number;
        investorsAdded: number;
        investorsReduced: number;
        investorsExited: number;
      }
    >();

    let investorsWithData = 0;

    for (const result of allChanges) {
      if (result.status !== "fulfilled" || !result.value) continue;
      investorsWithData++;

      const changes = result.value;
      for (const change of changes) {
        if (change.changeType === "UNCHANGED") continue;

        const existing = stockMap.get(change.cusip) ?? {
          companyName: change.nameOfIssuer,
          investorsNew: 0,
          investorsAdded: 0,
          investorsReduced: 0,
          investorsExited: 0,
        };

        if (change.changeType === "NEW") existing.investorsNew++;
        else if (change.changeType === "ADDED") existing.investorsAdded++;
        else if (change.changeType === "REDUCED") existing.investorsReduced++;
        else if (change.changeType === "EXITED") existing.investorsExited++;

        stockMap.set(change.cusip, existing);
      }
    }

    // Build consensus list
    const allStocks: StockConsensus[] = [];
    for (const [cusip, data] of stockMap) {
      const totalBullish = data.investorsNew + data.investorsAdded;
      const totalBearish = data.investorsReduced + data.investorsExited;
      const netScore = totalBullish - totalBearish;
      const totalActivity = totalBullish + totalBearish;

      allStocks.push({
        cusip,
        companyName: data.companyName,
        investorsNew: data.investorsNew,
        investorsAdded: data.investorsAdded,
        investorsReduced: data.investorsReduced,
        investorsExited: data.investorsExited,
        totalBullish,
        totalBearish,
        netScore,
        totalActivity,
      });
    }

    // Sort helpers with tie-breakers: higher total activity, then alphabetical
    const sortBought = [...allStocks]
      .filter((s) => s.netScore > 0)
      .sort(
        (a, b) =>
          b.netScore - a.netScore ||
          b.totalActivity - a.totalActivity ||
          a.companyName.localeCompare(b.companyName)
      )
      .slice(0, 5);

    const sortSold = [...allStocks]
      .filter((s) => s.netScore < 0)
      .sort(
        (a, b) =>
          a.netScore - b.netScore ||
          b.totalActivity - a.totalActivity ||
          a.companyName.localeCompare(b.companyName)
      )
      .slice(0, 5);

    const sortActivity = [...allStocks]
      .sort(
        (a, b) =>
          b.totalActivity - a.totalActivity ||
          a.companyName.localeCompare(b.companyName)
      )
      .slice(0, 5);

    const consensus: ConsensusResult = {
      mostNetBought: sortBought,
      mostNetSold: sortSold,
      mostActivity: sortActivity,
      investorCount: cikList.length,
      investorsWithData,
    };

    return NextResponse.json(consensus, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Consensus API error:", error);
    return NextResponse.json(
      { error: "Failed to compute consensus" },
      { status: 500 }
    );
  }
}
