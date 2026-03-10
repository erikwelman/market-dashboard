import type { Quote, HistoricalPoint, TimeRange, SearchResult } from "./types";

export interface MarketDataProvider {
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getChartData(
    symbol: string,
    range: TimeRange
  ): Promise<HistoricalPoint[]>;
  searchInstruments(query: string): Promise<SearchResult[]>;
}
