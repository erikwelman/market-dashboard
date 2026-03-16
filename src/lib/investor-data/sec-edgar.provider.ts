import type { InvestorDataProvider } from "./provider";
import type {
  InvestorSearchResult,
  Filing,
  Holding,
  PositionChange,
  FilingSummary,
  InvestorOverlap,
  PositionChangeType,
} from "./types";

// Fix #9: SEC User-Agent from environment variable
const SEC_USER_AGENT =
  process.env.SEC_EDGAR_USER_AGENT || "MarketDashboard admin@example.com";
const EDGAR_BASE = "https://data.sec.gov";
const EDGAR_COMPANY_SEARCH =
  "https://www.sec.gov/cgi-bin/browse-edgar";
const ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";

function padCik(cik: string): string {
  return cik.padStart(10, "0");
}

function accessionToPath(accessionNumber: string): string {
  return accessionNumber.replace(/-/g, "");
}

// Fix #11: SEC rate limiting (10 req/sec)
const requestTimestamps: number[] = [];
const SEC_MAX_REQUESTS_PER_SECOND = 10;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  // Remove timestamps older than 1 second
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > 1000) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= SEC_MAX_REQUESTS_PER_SECOND) {
    // Wait until the oldest request is more than 1 second old
    const waitMs = 1000 - (now - requestTimestamps[0]) + 10;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  requestTimestamps.push(Date.now());
  return edgarFetch(url);
}

async function edgarFetch(url: string): Promise<Response> {
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

// Fix #13: LRU cache for parsed 13F holdings (immutable once filed)
const holdingsCache = new Map<string, { holdings: Holding[]; timestamp: number }>();
const HOLDINGS_CACHE_MAX = 50;
const HOLDINGS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedHoldings(cacheKey: string): Holding[] | null {
  const entry = holdingsCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > HOLDINGS_CACHE_TTL) {
    holdingsCache.delete(cacheKey);
    return null;
  }
  return entry.holdings;
}

function setCachedHoldings(cacheKey: string, holdings: Holding[]): void {
  // Evict oldest if at capacity
  if (holdingsCache.size >= HOLDINGS_CACHE_MAX) {
    const firstKey = holdingsCache.keys().next().value;
    if (firstKey) holdingsCache.delete(firstKey);
  }
  holdingsCache.set(cacheKey, { holdings, timestamp: Date.now() });
}

// Fix #12: Cache filing history per request cycle
const filingHistoryCache = new Map<string, { data: { name: string; filings: Filing[] }; timestamp: number }>();
const FILING_HISTORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedFilingHistory(cik: string): { name: string; filings: Filing[] } | null {
  const entry = filingHistoryCache.get(cik);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > FILING_HISTORY_CACHE_TTL) {
    filingHistoryCache.delete(cik);
    return null;
  }
  return entry.data;
}

function setCachedFilingHistory(cik: string, data: { name: string; filings: Filing[] }): void {
  if (filingHistoryCache.size >= HOLDINGS_CACHE_MAX) {
    const firstKey = filingHistoryCache.keys().next().value;
    if (firstKey) filingHistoryCache.delete(firstKey);
  }
  filingHistoryCache.set(cik, { data, timestamp: Date.now() });
}

function extractXmlField(xml: string, tag: string): string {
  const regex = new RegExp(`<(?:ns1:)?${tag}>([^<]*)</(?:ns1:)?${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function parseInfoTableXml(xml: string): Holding[] {
  const holdings: Holding[] = [];
  // Match each infoTable entry (handles both namespaced and non-namespaced)
  const entryRegex =
    /<(?:ns1:)?infoTable>([\s\S]*?)<\/(?:ns1:)?infoTable>/gi;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const rawValue = parseInt(extractXmlField(entry, "value"), 10) || 0;
    const shares =
      parseInt(extractXmlField(entry, "sshPrnamt"), 10) || 0;
    const shareType =
      (extractXmlField(entry, "sshPrnamtType") as "SH" | "PRN") || "SH";

    // Fix #10: SEC 13F values are reported in thousands of dollars
    const value = rawValue * 1000;

    holdings.push({
      nameOfIssuer: extractXmlField(entry, "nameOfIssuer"),
      titleOfClass: extractXmlField(entry, "titleOfClass"),
      cusip: extractXmlField(entry, "cusip"),
      value,
      shares,
      shareType,
    });
  }

  // Calculate portfolio weights
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  if (totalValue > 0) {
    for (const h of holdings) {
      h.portfolioWeight = (h.value / totalValue) * 100;
    }
  }

  return holdings;
}

function classifyChanges(
  currentHoldings: Holding[],
  previousHoldings: Holding[]
): PositionChange[] {
  const prevMap = new Map<string, Holding>();
  for (const h of previousHoldings) {
    prevMap.set(h.cusip, h);
  }

  const currMap = new Map<string, Holding>();
  for (const h of currentHoldings) {
    currMap.set(h.cusip, h);
  }

  const changes: PositionChange[] = [];

  // Current holdings: NEW, ADDED, REDUCED, UNCHANGED
  for (const curr of currentHoldings) {
    const prev = prevMap.get(curr.cusip);
    let changeType: PositionChangeType;
    const previousShares = prev?.shares ?? 0;
    const previousValue = prev?.value ?? 0;
    const sharesChange = curr.shares - previousShares;

    if (!prev) {
      changeType = "NEW";
    } else if (curr.shares > prev.shares) {
      changeType = "ADDED";
    } else if (curr.shares < prev.shares) {
      changeType = "REDUCED";
    } else {
      changeType = "UNCHANGED";
    }

    changes.push({
      nameOfIssuer: curr.nameOfIssuer,
      titleOfClass: curr.titleOfClass,
      cusip: curr.cusip,
      changeType,
      currentShares: curr.shares,
      previousShares,
      currentValue: curr.value,
      previousValue,
      sharesChange,
      sharesChangePercent:
        previousShares > 0 ? (sharesChange / previousShares) * 100 : 100,
      valueChange: curr.value - previousValue,
    });
  }

  // Exited positions (in previous but not in current)
  for (const prev of previousHoldings) {
    if (!currMap.has(prev.cusip)) {
      changes.push({
        nameOfIssuer: prev.nameOfIssuer,
        titleOfClass: prev.titleOfClass,
        cusip: prev.cusip,
        changeType: "EXITED",
        currentShares: 0,
        previousShares: prev.shares,
        currentValue: 0,
        previousValue: prev.value,
        sharesChange: -prev.shares,
        sharesChangePercent: -100,
        valueChange: -prev.value,
      });
    }
  }

  return changes;
}

export class SecEdgarProvider implements InvestorDataProvider {
  async searchInvestors(query: string): Promise<InvestorSearchResult[]> {
    const searchUrl = `${EDGAR_COMPANY_SEARCH}?company=${encodeURIComponent(query)}&CIK=&type=13F&dateb=&owner=include&count=15&search_text=&action=getcompany&output=atom`;
    const searchRes = await rateLimitedFetch(searchUrl);
    const xml = await searchRes.text();

    // Extract CIKs from Atom feed
    const cikRegex = /<cik>(\d+)<\/cik>/g;
    const ciks: string[] = [];
    let match;
    while ((match = cikRegex.exec(xml)) !== null) {
      const cik = match[1];
      if (!ciks.includes(cik)) ciks.push(cik);
    }

    if (ciks.length === 0) return [];

    const results = await Promise.allSettled(
      ciks.slice(0, 10).map(async (cik) => {
        const subUrl = `${EDGAR_BASE}/submissions/CIK${padCik(cik)}.json`;
        const subRes = await rateLimitedFetch(subUrl);
        const data = await subRes.json();
        const name = data.name ?? "Unknown";

        // Find latest 13F filing date
        const forms: string[] = data.filings?.recent?.form ?? [];
        const filingDates: string[] = data.filings?.recent?.filingDate ?? [];
        let latestFilingDate: string | undefined;
        for (let i = 0; i < forms.length; i++) {
          if (forms[i] === "13F-HR" || forms[i] === "13F-HR/A") {
            latestFilingDate = filingDates[i];
            break;
          }
        }

        return { cik, name, latestFilingDate };
      })
    );

    const investors: InvestorSearchResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        investors.push(result.value);
      }
    }

    investors.sort((a, b) => {
      if (!a.latestFilingDate && !b.latestFilingDate) return 0;
      if (!a.latestFilingDate) return 1;
      if (!b.latestFilingDate) return -1;
      return b.latestFilingDate.localeCompare(a.latestFilingDate);
    });

    return investors;
  }

  async getInvestorFilingHistory(
    cik: string
  ): Promise<{ name: string; filings: Filing[] }> {
    // Check cache first
    const cached = getCachedFilingHistory(cik);
    if (cached) return cached;

    const url = `${EDGAR_BASE}/submissions/CIK${padCik(cik)}.json`;
    const res = await rateLimitedFetch(url);
    const data = await res.json();

    const name = data.name ?? "Unknown";
    const recent = data.filings?.recent ?? {};
    const forms: string[] = recent.form ?? [];
    const accessionNumbers: string[] = recent.accessionNumber ?? [];
    const filingDates: string[] = recent.filingDate ?? [];
    const reportDates: string[] = recent.reportDate ?? [];
    const primaryDocuments: string[] = recent.primaryDocument ?? [];

    const filings: Filing[] = [];
    for (let i = 0; i < forms.length; i++) {
      if (forms[i] === "13F-HR" || forms[i] === "13F-HR/A") {
        filings.push({
          accessionNumber: accessionNumbers[i],
          filingDate: filingDates[i],
          reportDate: reportDates[i],
          form: forms[i],
          primaryDocument: primaryDocuments[i],
        });
      }
    }

    const result = { name, filings };
    setCachedFilingHistory(cik, result);
    return result;
  }

  async getInvestorHoldings(
    cik: string,
    accessionNumber: string
  ): Promise<Holding[]> {
    // Fix #13: Check LRU cache first (13F filings are immutable)
    const cacheKey = `${cik}:${accessionNumber}`;
    const cached = getCachedHoldings(cacheKey);
    if (cached) return cached;

    const accPath = accessionToPath(accessionNumber);

    // First get the filing index to find the information table file
    const indexUrl = `${ARCHIVES_BASE}/${padCik(cik)}/${accPath}/index.json`;
    const indexRes = await rateLimitedFetch(indexUrl);
    const indexData = await indexRes.json();

    const items = indexData?.directory?.item ?? [];
    // Find the information table XML
    const infoTableFile = items.find(
      (item: { name: string; type: string }) =>
        item.name.toLowerCase().includes("infotable") &&
        (item.name.endsWith(".xml") || item.name.endsWith(".XML"))
    );

    let holdings: Holding[];

    if (!infoTableFile) {
      // Try alternative: look for any XML that's not the primary document
      const altFile = items.find(
        (item: { name: string }) =>
          item.name.endsWith(".xml") &&
          !item.name.toLowerCase().includes("primary")
      );
      if (!altFile) {
        holdings = [];
      } else {
        const xmlUrl = `${ARCHIVES_BASE}/${padCik(cik)}/${accPath}/${altFile.name}`;
        const xmlRes = await rateLimitedFetch(xmlUrl);
        const xml = await xmlRes.text();
        holdings = parseInfoTableXml(xml);
      }
    } else {
      const xmlUrl = `${ARCHIVES_BASE}/${padCik(cik)}/${accPath}/${infoTableFile.name}`;
      const xmlRes = await rateLimitedFetch(xmlUrl);
      const xml = await xmlRes.text();
      holdings = parseInfoTableXml(xml);
    }

    setCachedHoldings(cacheKey, holdings);
    return holdings;
  }

  async getInvestorPositionChanges(
    cik: string,
    accessionNumber: string
  ): Promise<PositionChange[]> {
    const { filings } = await this.getInvestorFilingHistory(cik);

    // Find current filing index
    const currentIdx = filings.findIndex(
      (f) => f.accessionNumber === accessionNumber
    );
    if (currentIdx === -1) return [];

    // Get current holdings
    const currentHoldings = await this.getInvestorHoldings(
      cik,
      accessionNumber
    );

    // Get previous filing's holdings (if exists)
    const previousFiling = filings[currentIdx + 1];
    if (!previousFiling) {
      // No prior filing - all positions are NEW
      return currentHoldings.map((h) => ({
        nameOfIssuer: h.nameOfIssuer,
        titleOfClass: h.titleOfClass,
        cusip: h.cusip,
        changeType: "NEW" as PositionChangeType,
        currentShares: h.shares,
        previousShares: 0,
        currentValue: h.value,
        previousValue: 0,
        sharesChange: h.shares,
        sharesChangePercent: 100,
        valueChange: h.value,
      }));
    }

    const previousHoldings = await this.getInvestorHoldings(
      cik,
      previousFiling.accessionNumber
    );

    return classifyChanges(currentHoldings, previousHoldings);
  }

  async getInvestorLatestFiling(cik: string): Promise<FilingSummary | null> {
    const { name, filings } = await this.getInvestorFilingHistory(cik);
    if (filings.length === 0) return null;

    const latest = filings[0];
    const currentHoldings = await this.getInvestorHoldings(
      cik,
      latest.accessionNumber
    );

    let changes: PositionChange[] = [];
    if (filings.length > 1) {
      const previousHoldings = await this.getInvestorHoldings(
        cik,
        filings[1].accessionNumber
      );
      changes = classifyChanges(currentHoldings, previousHoldings);
    }

    const newPositions = changes.filter((c) => c.changeType === "NEW").length;
    const increasedPositions = changes.filter(
      (c) => c.changeType === "ADDED"
    ).length;
    const reducedPositions = changes.filter(
      (c) => c.changeType === "REDUCED"
    ).length;
    const exitedPositions = changes.filter(
      (c) => c.changeType === "EXITED"
    ).length;
    const unchangedPositions = changes.filter(
      (c) => c.changeType === "UNCHANGED"
    ).length;

    const totalValue = currentHoldings.reduce((sum, h) => sum + h.value, 0);

    // Determine net direction
    const netBuyValue = changes
      .filter((c) => c.changeType === "NEW" || c.changeType === "ADDED")
      .reduce((sum, c) => sum + c.valueChange, 0);
    const netSellValue = changes
      .filter((c) => c.changeType === "REDUCED" || c.changeType === "EXITED")
      .reduce((sum, c) => sum + Math.abs(c.valueChange), 0);

    let netDirection: "NET_BUY" | "NET_SELL" | "HOLD" = "HOLD";
    if (netBuyValue > netSellValue * 1.1) netDirection = "NET_BUY";
    else if (netSellValue > netBuyValue * 1.1) netDirection = "NET_SELL";

    // Top moves by absolute value change
    const topMoves = [...changes]
      .sort((a, b) => Math.abs(b.valueChange) - Math.abs(a.valueChange))
      .slice(0, 5);

    return {
      investorName: name,
      cik,
      filingDate: latest.filingDate,
      reportDate: latest.reportDate,
      accessionNumber: latest.accessionNumber,
      totalPositions: currentHoldings.length,
      totalValue,
      newPositions,
      increasedPositions,
      reducedPositions,
      exitedPositions,
      unchangedPositions,
      netDirection,
      topMoves,
    };
  }

  async getCompanyInvestorOverlap(
    cusip: string,
    trackedCiks: string[]
  ): Promise<InvestorOverlap[]> {
    const overlaps: InvestorOverlap[] = [];

    const results = await Promise.allSettled(
      trackedCiks.map(async (cik) => {
        const { name, filings } = await this.getInvestorFilingHistory(cik);
        if (filings.length === 0) return null;

        const holdings = await this.getInvestorHoldings(
          cik,
          filings[0].accessionNumber
        );
        const holding = holdings.find((h) => h.cusip === cusip);
        if (!holding) return null;

        let changeType: PositionChangeType | undefined;
        if (filings.length > 1) {
          const prevHoldings = await this.getInvestorHoldings(
            cik,
            filings[1].accessionNumber
          );
          const prevHolding = prevHoldings.find((h) => h.cusip === cusip);
          if (!prevHolding) changeType = "NEW";
          else if (holding.shares > prevHolding.shares) changeType = "ADDED";
          else if (holding.shares < prevHolding.shares) changeType = "REDUCED";
          else changeType = "UNCHANGED";
        }

        return {
          cik,
          investorName: name,
          shares: holding.shares,
          value: holding.value,
          changeType,
        };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        overlaps.push(result.value);
      }
    }

    return overlaps;
  }
}
