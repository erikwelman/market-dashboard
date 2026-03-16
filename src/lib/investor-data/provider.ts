import type {
  InvestorSearchResult,
  Filing,
  Holding,
  PositionChange,
  FilingSummary,
  InvestorOverlap,
} from "./types";

export interface InvestorDataProvider {
  searchInvestors(query: string): Promise<InvestorSearchResult[]>;
  getInvestorFilingHistory(cik: string): Promise<{
    name: string;
    filings: Filing[];
  }>;
  getInvestorHoldings(
    cik: string,
    accessionNumber: string
  ): Promise<Holding[]>;
  getInvestorPositionChanges(
    cik: string,
    accessionNumber: string
  ): Promise<PositionChange[]>;
  getInvestorLatestFiling(cik: string): Promise<FilingSummary | null>;
  getCompanyInvestorOverlap(
    cusip: string,
    trackedCiks: string[]
  ): Promise<InvestorOverlap[]>;
}
