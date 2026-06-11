import type { HistoricalPoint, ChartPoint } from "./market-data/types";

export interface ChartIndicators {
  sma50: boolean;
  sma200: boolean;
  rsi: boolean;
  volume: boolean;
}

export const DEFAULT_INDICATORS: ChartIndicators = {
  sma50: false,
  sma200: false,
  rsi: false,
  volume: false,
};

// Close price for either point shape (HistoricalPoint only has value)
function closeOf(point: HistoricalPoint | ChartPoint): number {
  return (point as ChartPoint).close ?? point.value;
}

export function computeSMA(
  points: (HistoricalPoint | ChartPoint)[],
  period: number
): { time: number; value: number }[] {
  if (points.length < period) return [];
  const result: { time: number; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += closeOf(points[i]);
    if (i >= period) sum -= closeOf(points[i - period]);
    if (i >= period - 1) {
      result.push({ time: points[i].time, value: sum / period });
    }
  }
  return result;
}

export function computeRSI(
  points: (HistoricalPoint | ChartPoint)[],
  period: number = 14
): { time: number; value: number }[] {
  if (points.length <= period) return [];
  const result: { time: number; value: number }[] = [];

  // Seed with simple averages over the first `period` changes, then Wilder smoothing
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closeOf(points[i]) - closeOf(points[i - 1]);
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  const toRSI = (gain: number, loss: number) =>
    loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);

  result.push({ time: points[period].time, value: toRSI(avgGain, avgLoss) });

  for (let i = period + 1; i < points.length; i++) {
    const change = closeOf(points[i]) - closeOf(points[i - 1]);
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ time: points[i].time, value: toRSI(avgGain, avgLoss) });
  }
  return result;
}

export function toVolumeBars(
  points: (HistoricalPoint | ChartPoint)[]
): { time: number; value: number; color: string }[] {
  const bars: { time: number; value: number; color: string }[] = [];
  for (const point of points) {
    const p = point as ChartPoint;
    if (p.volume == null || p.volume === 0) continue;
    const up = p.close == null || p.open == null || p.close >= p.open;
    bars.push({
      time: p.time,
      value: p.volume,
      color: up ? "rgba(0, 200, 83, 0.4)" : "rgba(255, 23, 68, 0.4)",
    });
  }
  return bars;
}
