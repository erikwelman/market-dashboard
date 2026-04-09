import YahooFinance from "yahoo-finance2";
import type { MarketDataProvider } from "./provider";
import type { Quote, ChartPoint, TimeRange, SearchResult, NewsArticle } from "./types";
import { getRangeParams } from "./range-config";

const yf = new YahooFinance();

export class YahooFinanceProvider implements MarketDataProvider {
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(
      symbols.map((symbol) => yf.quote(symbol))
    );

    const quotes: Quote[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const q = result.value;
        quotes.push({
          symbol: q.symbol,
          name: q.shortName || q.longName || q.symbol,
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          currency: q.currency || "USD",
          exchange: q.exchange || "",
          marketState: q.marketState,
          volume: q.regularMarketVolume,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow,
        });
      }
    }
    return quotes;
  }

  async getChartData(
    symbol: string,
    range: TimeRange
  ): Promise<ChartPoint[]> {
    const params = getRangeParams(range);

    const result = await yf.chart(symbol, {
      period1: params.period1,
      interval: params.interval as "1d" | "1wk" | "1mo" | "5m" | "15m" | "30m" | "60m" | "1h" | "5d" | "3mo",
    });

    if (!result.quotes) return [];

    return result.quotes
      .filter((q) => q.close != null && q.date != null)
      .map((q) => ({
        time: Math.floor(new Date(q.date!).getTime() / 1000),
        value: q.close!,
        open: q.open ?? q.close!,
        high: q.high ?? q.close!,
        low: q.low ?? q.close!,
        close: q.close!,
      }));
  }

  async searchInstruments(query: string): Promise<SearchResult[]> {
    const result = await yf.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    return (result.quotes || [])
      .filter((q: Record<string, unknown>) => q.symbol && q.shortname)
      .slice(0, 10)
      .map((q: Record<string, unknown>) => ({
        symbol: q.symbol as string,
        name: (q.shortname as string) || (q.symbol as string),
        exchange: (q.exchange as string) || "",
        type: (q.quoteType as string) || "EQUITY",
      }));
  }

  async getNews(symbol: string, count: number = 4, companyName?: string): Promise<NewsArticle[]> {
    const baseTicker = symbol.replace(/\.[A-Z]+$/, "").toUpperCase();
    const isInternational = /\.[A-Z]{2,}$/.test(symbol);

    const toArticle = (n: { uuid: string; title: string; publisher: string; link: string; providerPublishTime: Date; relatedTickers?: string[] }): NewsArticle => ({
      id: n.uuid,
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      publishedAt: new Date(n.providerPublishTime).toISOString(),
      relatedTickers: n.relatedTickers || [],
    });

    const isTickerRelated = (n: NewsArticle) =>
      n.relatedTickers.some(
        (t) =>
          t === symbol ||
          t.toUpperCase() === baseTicker ||
          t.toUpperCase().startsWith(baseTicker + ".")
      );

    const collected: NewsArticle[] = [];
    const seenIds = new Set<string>();

    const addUnique = (articles: NewsArticle[]) => {
      for (const a of articles) {
        if (!seenIds.has(a.id)) {
          seenIds.add(a.id);
          collected.push(a);
        }
      }
    };

    // 1. Search by company name first (best relevance for international tickers)
    if (companyName) {
      const cleanName = companyName
        .replace(/\b(ltd\.?|limited|inc\.?|corp\.?|corporation|co\.?|plc|n\.v\.?|group|holdings?|pty|s\.?a\.?|a\.?g\.?|gmbh|b\.?v\.?)\b\.?/gi, "")
        .replace(/\bMgmt\b/gi, "Management")
        .replace(/\bIntl\b/gi, "International")
        .replace(/\bTech\b/gi, "Technology")
        .replace(/\bSvcs?\b/gi, "Services")
        .replace(/\bFin\b/gi, "Financial")
        .replace(/\bMfg\b/gi, "Manufacturing")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanName.length >= 3) {
        try {
          const nameResult = await yf.search(cleanName, {
            quotesCount: 0,
            newsCount: count * 5,
          });
          const nameNews = (nameResult.news || []).map(toArticle);

          // Ticker-matched articles from name search are highest quality
          const tickerMatched = nameNews.filter(isTickerRelated);
          addUnique(tickerMatched);

          // Articles mentioning the company name in the title are also relevant
          const nameWords = cleanName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
          const titleMatched = nameNews.filter(
            (n) =>
              !isTickerRelated(n) &&
              nameWords.some((w) => n.title.toLowerCase().includes(w))
          );
          addUnique(titleMatched);

          // Remaining name-search results (searched by company name, so likely relevant)
          const remaining = nameNews.filter((n) => !seenIds.has(n.id));
          addUnique(remaining);
        } catch {
          // continue to symbol search
        }
      }
    }

    if (collected.length >= count) return collected.slice(0, count);

    // 2. Search by symbol
    try {
      const symbolResult = await yf.search(symbol, {
        quotesCount: 0,
        newsCount: count * 5,
      });
      const symbolNews = (symbolResult.news || []).map(toArticle);

      // Only add articles that reference this ticker or mention the company
      const tickerMatched = symbolNews.filter((n) => !seenIds.has(n.id) && isTickerRelated(n));
      addUnique(tickerMatched);

      // For US tickers (no exchange suffix), symbol search results are generally
      // relevant, so we can use non-ticker-matched results as filler.
      // For international tickers, symbol search returns garbage — skip filler.
      if (!isInternational) {
        const filler = symbolNews.filter((n) => !seenIds.has(n.id));
        addUnique(filler);
      }
    } catch {
      // continue with what we have
    }

    // Return what we have — may be fewer than count, but all relevant
    return collected.slice(0, count);
  }
}
