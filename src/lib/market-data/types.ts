export interface Instrument {
  symbol: string;
  providerSymbol: string;
  name: string;
  exchange?: string;
  currency?: string;
  type: "equity" | "index" | "crypto";
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  marketState?: string;
  volume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface HistoricalPoint {
  time: number; // Unix timestamp in seconds
  value: number;
}

export interface ChartPoint extends HistoricalPoint {
  open: number;
  high: number;
  low: number;
  close: number;
}

export type ChartType = "area" | "candlestick";

export type TimeRange =
  | "1D"
  | "5D"
  | "1M"
  | "6M"
  | "YTD"
  | "1Y"
  | "5Y"
  | "10Y"
  | "MAX";

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  relatedTickers: string[];
}
