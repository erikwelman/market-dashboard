import type { DCFInputData, DCFAssumptions, DCFResult, SensitivityCell } from "./dcf-types";

const ERP = 0.055;
const DEFAULT_COST_OF_DEBT = 0.05;
const DEFAULT_TAX_RATE = 0.21;
const DEFAULT_TERMINAL_GROWTH = 0.025;

export function deriveAssumptions(data: DCFInputData): DCFAssumptions {
  // Growth rate: analyst estimate > revenue CAGR > 5% default
  let growthRate = 0.05;
  if (data.analystGrowthEstimate != null) {
    growthRate = data.analystGrowthEstimate;
  } else if (data.revenueHistory.length >= 2) {
    const sorted = [...data.revenueHistory].sort((a, b) => a.year - b.year);
    const first = sorted[0].totalRevenue;
    const last = sorted[sorted.length - 1].totalRevenue;
    const years = sorted[sorted.length - 1].year - sorted[0].year;
    if (first > 0 && years > 0) {
      growthRate = Math.pow(last / first, 1 / years) - 1;
    }
  }
  growthRate = Math.max(-0.05, Math.min(0.30, growthRate));

  // Discount rate via WACC
  const discountRate = calculateWACC(data);

  // Base FCF: most recent year
  const sorted = [...data.cashFlowHistory].sort((a, b) => b.year - a.year);
  const baseFCF = sorted.length > 0 ? sorted[0].freeCashFlow : 0;

  return {
    growthRate,
    terminalGrowthRate: DEFAULT_TERMINAL_GROWTH,
    discountRate,
    projectionYears: 10,
    baseFCF,
  };
}

export function calculateWACC(data: DCFInputData): number {
  const beta = data.beta ?? 1.0;
  const costOfEquity = data.riskFreeRate + beta * ERP;

  let costOfDebt = DEFAULT_COST_OF_DEBT;
  if (data.interestExpense != null && data.totalDebt > 0) {
    costOfDebt = Math.abs(data.interestExpense) / data.totalDebt;
  }

  const taxRate = data.taxRate || DEFAULT_TAX_RATE;
  const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);

  const equity = data.marketCap;
  const debt = data.totalDebt;
  const totalCapital = equity + debt;

  if (totalCapital <= 0) return costOfEquity;

  const wacc =
    (equity / totalCapital) * costOfEquity +
    (debt / totalCapital) * afterTaxCostOfDebt;

  // Clamp to reasonable range
  return Math.max(0.03, Math.min(0.20, wacc));
}

export function calculateDCF(
  assumptions: DCFAssumptions,
  data: DCFInputData
): DCFResult {
  const { growthRate, terminalGrowthRate, discountRate, projectionYears, baseFCF } = assumptions;

  // Project FCFs
  const projectedFCFs: DCFResult["projectedFCFs"] = [];
  for (let i = 1; i <= projectionYears; i++) {
    const fcf = baseFCF * Math.pow(1 + growthRate, i);
    const presentValue = fcf / Math.pow(1 + discountRate, i);
    projectedFCFs.push({ year: i, fcf, presentValue });
  }

  // Terminal value using Gordon Growth Model
  let terminalValue = 0;
  let terminalValuePV = 0;
  if (discountRate > terminalGrowthRate) {
    const lastFCF = baseFCF * Math.pow(1 + growthRate, projectionYears);
    terminalValue =
      (lastFCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
    terminalValuePV = terminalValue / Math.pow(1 + discountRate, projectionYears);
  }

  const sumPVs = projectedFCFs.reduce((sum, p) => sum + p.presentValue, 0);
  const enterpriseValue = sumPVs + terminalValuePV;

  const netDebt = data.totalDebt - data.totalCash;
  const equityValue = Math.max(0, enterpriseValue - netDebt);
  const intrinsicValuePerShare =
    data.sharesOutstanding > 0 ? equityValue / data.sharesOutstanding : 0;

  const currentPrice = data.currentPrice;
  const upside =
    currentPrice > 0 ? (intrinsicValuePerShare - currentPrice) / currentPrice : 0;

  return {
    projectedFCFs,
    terminalValue,
    terminalValuePV,
    enterpriseValue,
    netDebt,
    equityValue,
    intrinsicValuePerShare,
    currentPrice,
    upside,
  };
}

export function generateSensitivityTable(
  assumptions: DCFAssumptions,
  data: DCFInputData
): SensitivityCell[] {
  const growthOffsets = [-0.02, -0.01, 0, 0.01, 0.02];
  const discountOffsets = [-0.02, -0.01, 0, 0.01, 0.02];

  const cells: SensitivityCell[] = [];

  for (const gOff of growthOffsets) {
    for (const dOff of discountOffsets) {
      const modAssumptions: DCFAssumptions = {
        ...assumptions,
        growthRate: assumptions.growthRate + gOff,
        discountRate: assumptions.discountRate + dOff,
      };
      const result = calculateDCF(modAssumptions, data);
      cells.push({
        growthRate: modAssumptions.growthRate,
        discountRate: modAssumptions.discountRate,
        intrinsicValue: result.intrinsicValuePerShare,
      });
    }
  }

  return cells;
}
