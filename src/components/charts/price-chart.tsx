"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, AreaSeries, CandlestickSeries, type IChartApi, type ISeriesApi, ColorType, type UTCTimestamp } from "lightweight-charts";
import type { ChartPoint, ChartType } from "@/lib/market-data/types";
import { formatCurrency } from "@/lib/utils";

interface PriceChartProps {
  data: ChartPoint[];
  height?: number;
  positive?: boolean;
  currency?: string;
  chartType?: ChartType;
}

interface DragState {
  startX: number;
  startPrice: number;
  currentX: number;
  currentPrice: number;
}

export function PriceChart({ data, height = 300, positive = true, currency = "USD", chartType = "area" }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | ISeriesApi<"Candlestick"> | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const lastCrosshairPrice = useRef<number | null>(null);

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
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
    });

    let series: ISeriesApi<"Area"> | ISeriesApi<"Candlestick">;

    if (chartType === "candlestick") {
      series = chart.addSeries(CandlestickSeries, {
        upColor: "#00c853",
        borderUpColor: "#00c853",
        wickUpColor: "#00c853",
        downColor: "#ff1744",
        borderDownColor: "#ff1744",
        wickDownColor: "#ff1744",
        priceLineVisible: false,
        lastValueVisible: true,
      });
    } else {
      const lineColor = positive ? "#00c853" : "#ff1744";
      const topColor = positive ? "rgba(0, 200, 83, 0.3)" : "rgba(255, 23, 68, 0.3)";
      const bottomColor = positive ? "rgba(0, 200, 83, 0.0)" : "rgba(255, 23, 68, 0.0)";

      series = chart.addSeries(AreaSeries, {
        lineColor,
        topColor,
        bottomColor,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      });
    }

    chartRef.current = chart;
    seriesRef.current = series;

    // Track crosshair price for drag start
    chart.subscribeCrosshairMove((param) => {
      if (!param.seriesData || !seriesRef.current) return;
      const val = param.seriesData.get(seriesRef.current) as { value?: number; close?: number } | undefined;
      const price = val?.value ?? val?.close;
      if (price != null) {
        lastCrosshairPrice.current = price;

        // Update drag state during active drag
        if (isDraggingRef.current && param.point) {
          setDrag((prev) => {
            if (!prev) return prev;
            return { ...prev, currentX: param.point!.x, currentPrice: price };
          });
        }
      }
    });

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
  }, [height, positive, chartType]);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const sorted = [...data].sort((a, b) => a.time - b.time);
      if (chartType === "candlestick") {
        (seriesRef.current as ISeriesApi<"Candlestick">).setData(
          sorted.map((d) => ({ time: d.time as UTCTimestamp, open: d.open, high: d.high, low: d.low, close: d.close }))
        );
      } else {
        (seriesRef.current as ISeriesApi<"Area">).setData(
          sorted.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
        );
      }
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, chartType]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (lastCrosshairPrice.current == null) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    isDraggingRef.current = true;
    setDrag({
      startX: x,
      startPrice: lastCrosshairPrice.current,
      currentX: x,
      currentPrice: lastCrosshairPrice.current,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setDrag(null);
  }, []);

  useEffect(() => {
    // Listen on window so we catch mouseup even outside the chart
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  // Compute drag overlay values
  const dragDiff = drag ? drag.currentPrice - drag.startPrice : 0;
  const dragPct = drag && drag.startPrice !== 0
    ? ((drag.currentPrice - drag.startPrice) / drag.startPrice) * 100
    : 0;
  const dragPositive = dragDiff >= 0;
  const showDrag = drag && Math.abs(drag.currentX - drag.startX) > 4;

  return (
    <div ref={containerRef} className="w-full relative select-none" onMouseDown={handleMouseDown}>
      {/* Drag highlight band */}
      {showDrag && (
        <div
          className="absolute top-0 pointer-events-none"
          style={{
            left: Math.min(drag.startX, drag.currentX),
            width: Math.abs(drag.currentX - drag.startX),
            height: height,
            background: dragPositive
              ? "rgba(0, 200, 83, 0.08)"
              : "rgba(255, 23, 68, 0.08)",
            borderLeft: `1px dashed ${dragPositive ? "#00c853" : "#ff1744"}`,
            borderRight: `1px dashed ${dragPositive ? "#00c853" : "#ff1744"}`,
          }}
        />
      )}
      {/* Drag tooltip */}
      {showDrag && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: Math.max(drag.startX, drag.currentX) + 8,
            top: 8,
          }}
        >
          <div
            className="rounded-md px-2.5 py-1.5 text-xs font-medium shadow-lg border backdrop-blur-sm"
            style={{
              background: "rgba(30, 33, 43, 0.95)",
              borderColor: dragPositive
                ? "rgba(0, 200, 83, 0.3)"
                : "rgba(255, 23, 68, 0.3)",
            }}
          >
            <div
              className="tabular-nums font-semibold"
              style={{ color: dragPositive ? "#00c853" : "#ff1744" }}
            >
              {dragPositive ? "+" : ""}
              {formatCurrency(dragDiff, currency)}
            </div>
            <div
              className="tabular-nums"
              style={{ color: dragPositive ? "#00c853" : "#ff1744" }}
            >
              {dragPositive ? "+" : ""}
              {dragPct.toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
