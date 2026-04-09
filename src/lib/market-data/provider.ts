import type { Quote, ChartPoint, TimeRange, SearchResult, NewsArticle } from "./types";

export interface MarketDataProvider {
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getChartData(
    symbol: string,
    range: TimeRange
  ): Promise<ChartPoint[]>;
  searchInstruments(query: string): Promise<SearchResult[]>;
  getNews(symbol: string, count?: number, companyName?: string): Promise<NewsArticle[]>;
}
