"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  type UTCTimestamp,
} from "lightweight-charts";
import type { PortfolioHistoryPoint } from "@/hooks/use-portfolio-history";

interface PortfolioChartProps {
  data: PortfolioHistoryPoint[];
  benchmarkLabel: string;
  height?: number;
  isLoading: boolean;
}

export function PortfolioChart({
  data,
  benchmarkLabel,
  height = 280,
  isLoading,
}: PortfolioChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const portfolioSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const benchmarkSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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
        timeVisible: false,
      },
      handleScale: { mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
    });

    const portfolioSeries = chart.addSeries(LineSeries, {
      color: "#448aff",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      title: "Portfolio",
    });

    const benchmarkSeries = chart.addSeries(LineSeries, {
      color: "#9aa0ab",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      title: benchmarkLabel,
    });

    chartRef.current = chart;
    portfolioSeriesRef.current = portfolioSeries;
    benchmarkSeriesRef.current = benchmarkSeries;

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
      portfolioSeriesRef.current = null;
      benchmarkSeriesRef.current = null;
    };
  }, [height, benchmarkLabel]);

  useEffect(() => {
    if (
      portfolioSeriesRef.current &&
      benchmarkSeriesRef.current &&
      data.length > 0
    ) {
      const sorted = [...data].sort((a, b) => a.time - b.time);

      portfolioSeriesRef.current.setData(
        sorted.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.portfolioValue,
        }))
      );
      benchmarkSeriesRef.current.setData(
        sorted.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.benchmarkValue,
        }))
      );

      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-surface-1 border border-border rounded-lg p-4 mb-4 animate-pulse">
        <div className="h-4 w-32 bg-surface-3 rounded mb-3" />
        <div
          className="bg-surface-2 rounded"
          style={{ height: `${height}px` }}
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface-1 border border-border rounded-lg p-4 mb-4">
        <div className="text-xs text-text-muted mb-2">
          Performance vs Benchmark (% change)
        </div>
        <div
          className="flex items-center justify-center text-text-muted text-sm"
          style={{ height: `${height}px` }}
        >
          Add transactions to see performance chart
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="text-xs text-text-muted">
          Performance vs Benchmark (% change)
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-accent rounded" />
            <span className="text-[10px] text-text-secondary">Portfolio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: "#9aa0ab" }}
            />
            <span className="text-[10px] text-text-secondary">
              {benchmarkLabel}
            </span>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
