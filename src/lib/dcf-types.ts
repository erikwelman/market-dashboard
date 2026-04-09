export interface CashFlowYear {
  year: number;
  operatingCashflow: number;
  capitalExpenditures: number;
  freeCashFlow: number;
}

export interface RevenueYear {
  year: number;
  totalRevenue: number;
}

export interface DCFInputData {
  currentPrice: number;
  marketCap: number;
  sharesOutstanding: number;
  beta: number | null;
  totalDebt: number;
  totalCash: number;
  riskFreeRate: number;
  cashFlowHistory: CashFlowYear[];
  revenueHistory: RevenueYear[];
  analystGrowthEstimate: number | null;
  debtToEquity: number | null;
  interestExpense: number | null;
  taxRate: number;
}

export interface DCFAssumptions {
  growthRate: number;
  terminalGrowthRate: number;
  discountRate: number;
  projectionYears: number;
  baseFCF: number;
}

export interface DCFResult {
  projectedFCFs: { year: number; fcf: number; presentValue: number }[];
  terminalValue: number;
  terminalValuePV: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  currentPrice: number;
  upside: number;
}

export interface SensitivityCell {
  growthRate: number;
  discountRate: number;
  intrinsicValue: number;
}
