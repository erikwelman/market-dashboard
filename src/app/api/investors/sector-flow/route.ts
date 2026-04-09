import { NextRequest, NextResponse } from "next/server";
import { getInvestorProvider } from "@/lib/investor-data/registry";
import { reportDateToQuarter } from "@/lib/investor-data/quarters";
import type { SectorFlow } from "@/lib/alert-types";
import type { Holding, Filing } from "@/lib/investor-data/types";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

// Module-level sector/industry cache with 24h TTL
interface SectorCacheEntry {
  sector: string;
  industry: string;
  symbol: string;
  cachedAt: number;
}

const sectorCache = new Map<string, SectorCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedSector(cusip: string): SectorCacheEntry | null {
  const entry = sectorCache.get(cusip);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    sectorCache.delete(cusip);
    return null;
  }
  return entry;
}

async function resolveSectorForHolding(
  holding: Holding
): Promise<{ sector: string; industry: string; symbol: string }> {
  const cached = getCachedSector(holding.cusip);
  if (cached) return cached;

  try {
    // Try to find symbol via Yahoo Finance search using company name
    const searchResult = await yf.search(holding.nameOfIssuer);
    const match = searchResult.quotes?.find(
      (q) => "quoteType" in q && (q.quoteType === "EQUITY" || q.quoteType === "ETF")
    );

    if (match && "symbol" in match && typeof match.symbol === "string" && match.symbol) {
      const resolvedSymbol: string = match.symbol;
      try {
        const summary = await yf.quoteSummary(resolvedSymbol, {
          modules: ["summaryProfile"],
        });
        const sector = summary.summaryProfile?.sector || "Unknown";
        const industry = summary.summaryProfile?.industry || "Unknown";

        const entry: SectorCacheEntry = {
          sector,
          industry,
          symbol: resolvedSymbol,
          cachedAt: Date.now(),
        };
        sectorCache.set(holding.cusip, entry);
        return entry;
      } catch {
        // quoteSummary failed, use fallback
      }
    }
  } catch {
    // search failed, use fallback
  }

  const fallback: SectorCacheEntry = {
    sector: "Unknown",
    industry: "Unknown",
    symbol: "",
    cachedAt: Date.now(),
  };
  sectorCache.set(holding.cusip, fallback);
  return fallback;
}

function findFilingForQuarter(
  filings: Filing[],
  targetQuarter?: string
): Filing | null {
  if (!targetQuarter) {
    return filings[0] || null; // latest
  }

  // targetQuarter format: "2025-Q4" -> need to match "Q4 2025"
  const [year, q] = targetQuarter.split("-");
  const normalized = `${q} ${year}`;

  for (const filing of filings) {
    const fq = reportDateToQuarter(filing.reportDate);
    if (fq === normalized) return filing;
  }
  return null;
}

function findPreviousFiling(
  filings: Filing[],
  currentFiling: Filing
): Filing | null {
  const currentIndex = filings.findIndex(
    (f) => f.accessionNumber === currentFiling.accessionNumber
  );
  if (currentIndex < 0 || currentIndex >= filings.length - 1) return null;
  return filings[currentIndex + 1];
}

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

  const quarter = request.nextUrl.searchParams.get("quarter") || undefined;

  try {
    const provider = getInvestorProvider();

    // Collect all holdings across investors for the requested quarter
    const allCurrentHoldings: Holding[] = [];
    const allPreviousHoldings: Holding[] = [];
    let resolvedQuarter = "";

    const results = await Promise.allSettled(
      cikList.map(async (cik) => {
        const { filings } = await provider.getInvestorFilingHistory(cik);
        if (filings.length === 0) return null;

        const currentFiling = findFilingForQuarter(filings, quarter);
        if (!currentFiling) return null;

        if (!resolvedQuarter) {
          resolvedQuarter = reportDateToQuarter(currentFiling.reportDate);
        }

        const currentHoldings = await provider.getInvestorHoldings(
          cik,
          currentFiling.accessionNumber
        );

        const previousFiling = findPreviousFiling(filings, currentFiling);
        let previousHoldings: Holding[] = [];
        if (previousFiling) {
          previousHoldings = await provider.getInvestorHoldings(
            cik,
            previousFiling.accessionNumber
          );
        }

        return { currentHoldings, previousHoldings };
      })
    );

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      allCurrentHoldings.push(...result.value.currentHoldings);
      allPreviousHoldings.push(...result.value.previousHoldings);
    }

    if (allCurrentHoldings.length === 0) {
      const emptyResult: SectorFlow = {
        quarter: resolvedQuarter || "Unknown",
        sectors: [],
      };
      return NextResponse.json(emptyResult, {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      });
    }

    // Deduplicate holdings by cusip and aggregate
    const currentByCusip = new Map<
      string,
      { name: string; totalValue: number; totalShares: number }
    >();
    for (const h of allCurrentHoldings) {
      const existing = currentByCusip.get(h.cusip);
      if (existing) {
        existing.totalValue += h.value;
        existing.totalShares += h.shares;
      } else {
        currentByCusip.set(h.cusip, {
          name: h.nameOfIssuer,
          totalValue: h.value,
          totalShares: h.shares,
        });
      }
    }

    const previousByCusip = new Map<
      string,
      { totalValue: number; totalShares: number }
    >();
    for (const h of allPreviousHoldings) {
      const existing = previousByCusip.get(h.cusip);
      if (existing) {
        existing.totalValue += h.value;
        existing.totalShares += h.shares;
      } else {
        previousByCusip.set(h.cusip, {
          totalValue: h.value,
          totalShares: h.shares,
        });
      }
    }

    // Resolve sectors for each unique cusip (batch with concurrency limit)
    const cusips = Array.from(currentByCusip.keys());
    const holdingWithSector: {
      cusip: string;
      name: string;
      sector: string;
      industry: string;
      currentValue: number;
      previousValue: number;
    }[] = [];

    // Process in batches of 5 to avoid rate limiting
    const BATCH_SIZE = 5;
    for (let i = 0; i < cusips.length; i += BATCH_SIZE) {
      const batch = cusips.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (cusip) => {
          const holding = currentByCusip.get(cusip)!;
          const sectorInfo = await resolveSectorForHolding({
            nameOfIssuer: holding.name,
            cusip,
            value: holding.totalValue,
            shares: holding.totalShares,
            titleOfClass: "",
            shareType: "SH",
          });
          const prev = previousByCusip.get(cusip);
          return {
            cusip,
            name: holding.name,
            sector: sectorInfo.sector,
            industry: sectorInfo.industry,
            currentValue: holding.totalValue,
            previousValue: prev?.totalValue || 0,
          };
        })
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled") holdingWithSector.push(r.value);
      }
    }

    // Group by sector, then industry
    const sectorMap = new Map<
      string,
      Map<
        string,
        {
          totalValue: number;
          valueChange: number;
          holdings: number;
          topHoldings: { name: string; value: number }[];
          inflowCount: number;
          outflowCount: number;
        }
      >
    >();

    for (const h of holdingWithSector) {
      if (!sectorMap.has(h.sector)) sectorMap.set(h.sector, new Map());
      const industryMap = sectorMap.get(h.sector)!;

      if (!industryMap.has(h.industry)) {
        industryMap.set(h.industry, {
          totalValue: 0,
          valueChange: 0,
          holdings: 0,
          topHoldings: [],
          inflowCount: 0,
          outflowCount: 0,
        });
      }

      const ind = industryMap.get(h.industry)!;
      ind.totalValue += h.currentValue;
      const change = h.currentValue - h.previousValue;
      ind.valueChange += change;
      ind.holdings++;
      ind.topHoldings.push({ name: h.name, value: h.currentValue });

      if (change > 0) ind.inflowCount++;
      else if (change < 0) ind.outflowCount++;
    }

    // Build SectorFlow response
    const sectors: SectorFlow["sectors"] = [];

    for (const [sectorName, industryMap] of sectorMap) {
      let sectorTotalValue = 0;
      let sectorValueChange = 0;
      let sectorInflowCount = 0;
      let sectorOutflowCount = 0;

      const industries: SectorFlow["sectors"][0]["industries"] = [];

      for (const [industryName, data] of industryMap) {
        sectorTotalValue += data.totalValue;
        sectorValueChange += data.valueChange;
        sectorInflowCount += data.inflowCount;
        sectorOutflowCount += data.outflowCount;

        const sortedTopHoldings = data.topHoldings
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
          .map((h) => h.name);

        const indValueChangePct =
          data.totalValue - data.valueChange !== 0
            ? (data.valueChange / (data.totalValue - data.valueChange)) * 100
            : 0;

        industries.push({
          name: industryName,
          totalValue: data.totalValue,
          valueChange: data.valueChange,
          valueChangePct: Math.round(indValueChangePct * 100) / 100,
          holdings: data.holdings,
          topHoldings: sortedTopHoldings,
        });
      }

      const sectorValueChangePct =
        sectorTotalValue - sectorValueChange !== 0
          ? (sectorValueChange / (sectorTotalValue - sectorValueChange)) * 100
          : 0;

      let direction: "INFLOW" | "OUTFLOW" | "NEUTRAL" = "NEUTRAL";
      if (sectorInflowCount > sectorOutflowCount) direction = "INFLOW";
      else if (sectorOutflowCount > sectorInflowCount) direction = "OUTFLOW";

      sectors.push({
        name: sectorName,
        totalValue: sectorTotalValue,
        valueChange: sectorValueChange,
        valueChangePct: Math.round(sectorValueChangePct * 100) / 100,
        direction,
        industries: industries.sort((a, b) => b.totalValue - a.totalValue),
      });
    }

    // Sort sectors by total value descending
    sectors.sort((a, b) => b.totalValue - a.totalValue);

    const result: SectorFlow = {
      quarter: resolvedQuarter || "Unknown",
      sectors,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Sector flow API error:", error);
    return NextResponse.json(
      { error: "Failed to compute sector flow" },
      { status: 500 }
    );
  }
}
