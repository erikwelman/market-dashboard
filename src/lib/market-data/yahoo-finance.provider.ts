import YahooFinance from "yahoo-finance2";
import type { MarketDataProvider } from "./provider";
import type { Quote, HistoricalPoint, TimeRange, SearchResult } from "./types";
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
  ): Promise<HistoricalPoint[]> {
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
}
