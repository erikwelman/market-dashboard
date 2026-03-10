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
