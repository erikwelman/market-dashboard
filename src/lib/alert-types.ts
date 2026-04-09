export interface FilingAlert {
  id: string;
  investorName: string;
  investorCik: string;
  filingDate: string;
  quarter: string;
  symbol: string | null;
  companyName: string;
  cusip: string;
  changeType: "NEW_POSITION" | "EXITED" | "INCREASED" | "DECREASED";
  previousShares: number | null;
  currentShares: number | null;
  previousValue: number | null;
  currentValue: number | null;
  percentChange: number | null;
  read: boolean;
}

export interface WatchlistAlert {
  id: string;
  symbol: string;
  type: "PRICE_ABOVE" | "PRICE_BELOW" | "PCT_CHANGE_UP" | "PCT_CHANGE_DOWN";
  action: "BUY" | "SELL";
  threshold: number;
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
  active: boolean;
  read: boolean;
}

export interface EarningsData {
  symbol: string;
  companyName: string;
  nextEarningsDate: string | null;
  earningsHistory: {
    quarter: string;
    date: string;
    epsEstimate: number | null;
    epsActual: number | null;
    surprise: number | null;
    surprisePct: number | null;
    revenueEstimate: number | null;
    revenueActual: number | null;
  }[];
}

export interface Fundamentals {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  marketCap: number;
  enterpriseValue: number;
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  evToEbitda: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  dividendYield: number | null;
  dividendRate: number | null;
  payoutRatio: number | null;
  exDividendDate: string | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  eps: number | null;
  bookValue: number | null;
  revenuePerShare: number | null;
}

export interface InsiderTrade {
  filingDate: string;
  transactionDate: string;
  insiderName: string;
  insiderTitle: string;
  transactionType: "BUY" | "SELL" | "OPTION_EXERCISE" | "GIFT" | "OTHER";
  shares: number;
  pricePerShare: number | null;
  totalValue: number | null;
  sharesOwnedAfter: number;
  symbol: string;
  companyName: string;
  secFilingUrl: string;
}

export interface SectorFlow {
  quarter: string;
  sectors: {
    name: string;
    totalValue: number;
    valueChange: number;
    valueChangePct: number;
    direction: "INFLOW" | "OUTFLOW" | "NEUTRAL";
    industries: {
      name: string;
      totalValue: number;
      valueChange: number;
      valueChangePct: number;
      holdings: number;
      topHoldings: string[];
    }[];
  }[];
}

export interface ConvictionData {
  symbol: string;
  companyName: string;
  investors: {
    name: string;
    cik: string;
    totalQuartersHeld: number;
    currentStreak: number;
    isCurrentHolder: boolean;
    trend: "INCREASING" | "DECREASING" | "STABLE" | "EXITED";
    quarterHistory: {
      quarter: string;
      shares: number;
      value: number;
      portfolioWeight: number;
    }[];
  }[];
}

export interface PaperPortfolio {
  id: string;
  name: string;
  createdAt: string;
  benchmark: string;
  positions: PaperPosition[];
}

export interface PaperPosition {
  id: string;
  symbol: string;
  shares: number;
  avgCostBasis: number;
  transactions: PaperTransaction[];
}

export interface PaperTransaction {
  id: string;
  type: "BUY" | "SELL";
  symbol: string;
  shares: number;
  price: number;
  date: string;
  note?: string;
}
