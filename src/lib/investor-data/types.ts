export interface InvestorSearchResult {
  cik: string;
  name: string;
  latestFilingDate?: string;
}

export interface TrackedInvestor {
  cik: string;
  name: string;
}

export interface Filing {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
}

export interface Holding {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  value: number; // in USD
  shares: number;
  shareType: "SH" | "PRN";
  portfolioWeight?: number;
}

export type PositionChangeType =
  | "NEW"
  | "ADDED"
  | "REDUCED"
  | "EXITED"
  | "UNCHANGED";

export interface PositionChange {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  changeType: PositionChangeType;
  currentShares: number;
  previousShares: number;
  currentValue: number;
  previousValue: number;
  sharesChange: number;
  sharesChangePercent: number;
  valueChange: number;
}

export interface FilingSummary {
  investorName: string;
  cik: string;
  filingDate: string;
  reportDate: string;
  accessionNumber: string;
  totalPositions: number;
  totalValue: number;
  newPositions: number;
  increasedPositions: number;
  reducedPositions: number;
  exitedPositions: number;
  unchangedPositions: number;
  netDirection: "NET_BUY" | "NET_SELL" | "HOLD";
  topMoves: PositionChange[];
}

export interface InvestorOverlap {
  cik: string;
  investorName: string;
  shares: number;
  value: number;
  changeType?: PositionChangeType;
}

export interface StockConsensus {
  cusip: string;
  companyName: string;
  investorsNew: number;
  investorsAdded: number;
  investorsReduced: number;
  investorsExited: number;
  totalBullish: number;
  totalBearish: number;
  netScore: number;
  totalActivity: number;
}

export interface ConsensusResult {
  mostNetBought: StockConsensus[];
  mostNetSold: StockConsensus[];
  mostActivity: StockConsensus[];
  investorCount: number;
  investorsWithData: number;
}
