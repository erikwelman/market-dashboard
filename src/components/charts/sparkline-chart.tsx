"use client";

import { useEffect, useRef } from "react";
import { createChart, AreaSeries, ColorType, type UTCTimestamp } from "lightweight-charts";
import type { HistoricalPoint } from "@/lib/market-data/types";

interface SparklineChartProps {
  data: HistoricalPoint[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export function SparklineChart({
  data,
  width = 120,
  height = 40,
  positive = true,
}: SparklineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      handleScale: false,
      handleScroll: false,
    });

    const lineColor = positive ? "#00c853" : "#ff1744";
    const topColor = positive ? "rgba(0, 200, 83, 0.15)" : "rgba(255, 23, 68, 0.15)";

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor: "transparent",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const sorted = [...data].sort((a, b) => a.time - b.time);
    series.setData(
      sorted.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
    );
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data, width, height, positive]);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className="flex-shrink-0"
    />
  );
}
