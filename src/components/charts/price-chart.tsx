"use client";

import { useEffect, useRef } from "react";
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, ColorType, type UTCTimestamp } from "lightweight-charts";
import type { HistoricalPoint } from "@/lib/market-data/types";

interface PriceChartProps {
  data: HistoricalPoint[];
  height?: number;
  positive?: boolean;
}

export function PriceChart({ data, height = 300, positive = true }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9aa0ab",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 58, 0.4)" },
        horzLines: { color: "rgba(42, 46, 58, 0.4)" },
      },
      crosshair: {
        vertLine: { color: "#448aff", width: 1, style: 2 },
        horzLine: { color: "#448aff", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#2a2e3a",
      },
      timeScale: {
        borderColor: "#2a2e3a",
        timeVisible: true,
      },
      handleScale: { mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
    });

    const lineColor = positive ? "#00c853" : "#ff1744";
    const topColor = positive ? "rgba(0, 200, 83, 0.3)" : "rgba(255, 23, 68, 0.3)";
    const bottomColor = positive ? "rgba(0, 200, 83, 0.0)" : "rgba(255, 23, 68, 0.0)";

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, positive]);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const sorted = [...data].sort((a, b) => a.time - b.time);
      seriesRef.current.setData(
        sorted.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
}
