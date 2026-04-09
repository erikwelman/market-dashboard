import { NextRequest, NextResponse } from "next/server";
import type { InsiderTrade } from "@/lib/alert-types";

const SEC_USER_AGENT =
  process.env.SEC_EDGAR_USER_AGENT || "MarketDashboard admin@example.com";
const EDGAR_BASE = "https://data.sec.gov";
const ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";

// Rate limiting - share the same 10 req/sec limit
const requestTimestamps: number[] = [];
const SEC_MAX_REQUESTS_PER_SECOND = 10;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > 1000) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= SEC_MAX_REQUESTS_PER_SECOND) {
    const waitMs = 1000 - (now - requestTimestamps[0]) + 10;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  requestTimestamps.push(Date.now());
  const res = await fetch(url, {
    headers: {
      "User-Agent": SEC_USER_AGENT,
      Accept: "application/json, text/xml, */*",
    },
  });
  if (!res.ok) {
    throw new Error(`SEC EDGAR request failed: ${res.status} ${url}`);
  }
  return res;
}

function padCik(cik: string): string {
  return cik.padStart(10, "0");
}

function accessionToPath(accessionNumber: string): string {
  return accessionNumber.replace(/-/g, "");
}

function extractXmlField(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>\\s*<value>([^<]*)</value>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractSimpleField(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function classifyTransactionType(
  code: string,
  acquiredDisposed: string
): InsiderTrade["transactionType"] {
  // Transaction codes: P=Purchase, S=Sale, M=Option Exercise, G=Gift, etc.
  switch (code.toUpperCase()) {
    case "P":
      return "BUY";
    case "S":
      return "SELL";
    case "M":
    case "C":
    case "A":
      return "OPTION_EXERCISE";
    case "G":
    case "J":
      return "GIFT";
    default:
      // Fall back to acquired/disposed
      if (acquiredDisposed === "A") return "BUY";
      if (acquiredDisposed === "D") return "SELL";
      return "OTHER";
  }
}

function parseForm4Xml(
  xml: string,
  symbol: string,
  filingDate: string,
  cik: string,
  accessionNumber: string
): InsiderTrade[] {
  const trades: InsiderTrade[] = [];

  // Extract owner info
  const ownerNameMatch = xml.match(
    /<rptOwnerName>([^<]*)<\/rptOwnerName>/i
  );
  const insiderName = ownerNameMatch ? ownerNameMatch[1].trim() : "Unknown";

  // Extract title
  const titleMatch = xml.match(
    /<officerTitle>([^<]*)<\/officerTitle>/i
  );
  const isDirectorMatch = xml.match(
    /<isDirector>([^<]*)<\/isDirector>/i
  );
  const isOfficerMatch = xml.match(
    /<isOfficer>([^<]*)<\/isOfficer>/i
  );
  const isTenPctMatch = xml.match(
    /<isTenPercentOwner>([^<]*)<\/isTenPercentOwner>/i
  );

  let insiderTitle = titleMatch ? titleMatch[1].trim() : "";
  if (!insiderTitle) {
    const roles: string[] = [];
    if (isDirectorMatch && isDirectorMatch[1].trim() === "1")
      roles.push("Director");
    if (isOfficerMatch && isOfficerMatch[1].trim() === "1")
      roles.push("Officer");
    if (isTenPctMatch && isTenPctMatch[1].trim() === "1")
      roles.push("10% Owner");
    insiderTitle = roles.join(", ") || "Insider";
  }

  // Extract company name
  const issuerNameMatch = xml.match(
    /<issuerName>([^<]*)<\/issuerName>/i
  );
  const companyName = issuerNameMatch
    ? issuerNameMatch[1].trim()
    : symbol;

  // Parse non-derivative transactions
  const txnRegex =
    /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  let txnMatch;
  while ((txnMatch = txnRegex.exec(xml)) !== null) {
    const entry = txnMatch[1];

    const transactionDate = extractXmlField(entry, "transactionDate");
    const shares =
      parseFloat(extractXmlField(entry, "transactionShares")) || 0;
    const priceStr = extractXmlField(entry, "transactionPricePerShare");
    const pricePerShare = priceStr ? parseFloat(priceStr) : null;
    const acquiredDisposed = extractXmlField(
      entry,
      "transactionAcquiredDisposedCode"
    );

    // Transaction code
    const codeMatch = entry.match(
      /<transactionCode>([^<]*)<\/transactionCode>/i
    );
    const txnCode = codeMatch ? codeMatch[1].trim() : "";

    const sharesOwnedAfterStr = extractXmlField(
      entry,
      "sharesOwnedFollowingTransaction"
    );
    const sharesOwnedAfter = sharesOwnedAfterStr
      ? parseFloat(sharesOwnedAfterStr)
      : 0;

    const transactionType = classifyTransactionType(
      txnCode,
      acquiredDisposed
    );
    const totalValue =
      pricePerShare != null && shares > 0
        ? Math.round(pricePerShare * shares * 100) / 100
        : null;

    const accPath = accessionToPath(accessionNumber);
    const secFilingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accPath}/`;

    trades.push({
      filingDate,
      transactionDate: transactionDate || filingDate,
      insiderName,
      insiderTitle,
      transactionType,
      shares,
      pricePerShare,
      totalValue,
      sharesOwnedAfter,
      symbol: symbol.toUpperCase(),
      companyName,
      secFilingUrl,
    });
  }

  return trades;
}

// Cache for CIK lookups by ticker
const tickerCikCache = new Map<
  string,
  { cik: string; companyName: string } | null
>();

async function lookupCompanyCik(
  ticker: string
): Promise<{ cik: string; companyName: string } | null> {
  const upper = ticker.toUpperCase();
  if (tickerCikCache.has(upper)) {
    return tickerCikCache.get(upper) ?? null;
  }

  try {
    // Use SEC EDGAR full-text search or company tickers endpoint
    const tickersUrl = `${EDGAR_BASE}/submissions/CIK${padCik("0")}.json`;
    // More reliable: use the company search endpoint
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(upper)}%22&dateRange=custom&startdt=2020-01-01&forms=4`;

    // Simpler approach: use the SEC company tickers JSON
    const companyTickersRes = await rateLimitedFetch(
      "https://www.sec.gov/files/company_tickers.json"
    );
    const companyTickers = await companyTickersRes.json();

    for (const key of Object.keys(companyTickers)) {
      const entry = companyTickers[key];
      if (
        entry.ticker &&
        entry.ticker.toUpperCase() === upper
      ) {
        const result = {
          cik: String(entry.cik_str),
          companyName: entry.title || upper,
        };
        tickerCikCache.set(upper, result);
        return result;
      }
    }

    tickerCikCache.set(upper, null);
    return null;
  } catch {
    tickerCikCache.set(upper, null);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "symbol parameter required" },
      { status: 400 }
    );
  }

  try {
    // Look up CIK from ticker
    const company = await lookupCompanyCik(symbol);
    if (!company) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      });
    }

    const { cik } = company;

    // Fetch filings of type "4" (Form 4 - insider transactions)
    const submissionsUrl = `${EDGAR_BASE}/submissions/CIK${padCik(cik)}.json`;
    const submissionsRes = await rateLimitedFetch(submissionsUrl);
    const submissionsData = await submissionsRes.json();

    const recent = submissionsData.filings?.recent ?? {};
    const forms: string[] = recent.form ?? [];
    const accessionNumbers: string[] = recent.accessionNumber ?? [];
    const filingDates: string[] = recent.filingDate ?? [];
    const primaryDocuments: string[] = recent.primaryDocument ?? [];

    // Collect Form 4 filings (limit to most recent 20)
    const form4Filings: {
      accessionNumber: string;
      filingDate: string;
      primaryDocument: string;
    }[] = [];

    for (let i = 0; i < forms.length && form4Filings.length < 20; i++) {
      if (forms[i] === "4") {
        form4Filings.push({
          accessionNumber: accessionNumbers[i],
          filingDate: filingDates[i],
          primaryDocument: primaryDocuments[i],
        });
      }
    }

    // Parse each Form 4 filing
    const allTrades: InsiderTrade[] = [];
    const parseResults = await Promise.allSettled(
      form4Filings.map(async (filing) => {
        const accPath = accessionToPath(filing.accessionNumber);
        const docName = filing.primaryDocument;
        const xmlUrl = `${ARCHIVES_BASE}/${cik}/${accPath}/${docName}`;

        const xmlRes = await rateLimitedFetch(xmlUrl);
        const xml = await xmlRes.text();
        return parseForm4Xml(
          xml,
          symbol,
          filing.filingDate,
          cik,
          filing.accessionNumber
        );
      })
    );

    for (const result of parseResults) {
      if (result.status === "fulfilled") {
        allTrades.push(...result.value);
      }
    }

    // Sort by filing date desc
    allTrades.sort(
      (a, b) =>
        new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
    );

    return NextResponse.json(allTrades, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Insider trades error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insider trades" },
      { status: 500 }
    );
  }
}
