"use client";

import { useState, useMemo } from "react";
import type { SectorFlow } from "@/lib/alert-types";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface SectorHeatmapProps {
  data: SectorFlow;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  sector: SectorFlow["sectors"][0] | null;
}

function getCellColor(valueChangePct: number): string {
  if (valueChangePct > 0) {
    return `rgba(0,200,83,${Math.min(Math.abs(valueChangePct) / 20, 0.6)})`;
  }
  if (valueChangePct < 0) {
    return `rgba(255,23,68,${Math.min(Math.abs(valueChangePct) / 20, 0.6)})`;
  }
  return "rgba(90,100,120,0.15)";
}

export function SectorHeatmap({ data }: SectorHeatmapProps) {
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    sector: null,
  });

  const totalValue = useMemo(
    () => data.sectors.reduce((sum, s) => sum + s.totalValue, 0),
    [data.sectors]
  );

  // Calculate grid layout: sectors sized proportionally to value
  const sortedSectors = useMemo(
    () => [...data.sectors].sort((a, b) => b.totalValue - a.totalValue),
    [data.sectors]
  );

  const handleMouseEnter = (
    e: React.MouseEvent,
    sector: SectorFlow["sectors"][0]
  ) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      sector,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const expandedSectorData = expandedSector
    ? sortedSectors.find((s) => s.name === expandedSector)
    : null;

  return (
    <div className="space-y-3">
      {/* Heatmap grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
        {sortedSectors.map((sector) => {
          const proportion = totalValue > 0 ? sector.totalValue / totalValue : 0;
          // Min height 60px, max 160px based on proportion
          const height = Math.max(60, Math.min(160, proportion * 600));

          return (
            <button
              key={sector.name}
              onClick={() =>
                setExpandedSector(
                  expandedSector === sector.name ? null : sector.name
                )
              }
              onMouseEnter={(e) => handleMouseEnter(e, sector)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "relative rounded-md p-2 flex flex-col justify-between text-left transition-all border",
                expandedSector === sector.name
                  ? "border-accent ring-1 ring-accent"
                  : "border-transparent hover:border-border"
              )}
              style={{
                backgroundColor: getCellColor(sector.valueChangePct),
                minHeight: `${height}px`,
              }}
            >
              <span className="text-[11px] font-medium text-text-primary leading-tight line-clamp-2">
                {sector.name}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">
                  {formatCurrency(sector.totalValue, "USD", true)}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    sector.valueChangePct > 0
                      ? "text-gain"
                      : sector.valueChangePct < 0
                        ? "text-loss"
                        : "text-text-muted"
                  )}
                >
                  {formatPercent(sector.valueChangePct)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.sector && (
        <div
          className="fixed z-50 bg-surface-2 border border-border rounded-lg shadow-lg p-3 pointer-events-none max-w-xs"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 8}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-xs font-semibold text-text-primary mb-1">
            {tooltip.sector.name}
          </p>
          <div className="space-y-0.5 text-[10px] text-text-secondary">
            <p>
              Total Value: {formatCurrency(tooltip.sector.totalValue, "USD", true)}
            </p>
            <p>
              Change:{" "}
              <span
                className={
                  tooltip.sector.valueChangePct > 0
                    ? "text-gain"
                    : tooltip.sector.valueChangePct < 0
                      ? "text-loss"
                      : ""
                }
              >
                {formatPercent(tooltip.sector.valueChangePct)}
              </span>
            </p>
            <p>Industries: {tooltip.sector.industries.length}</p>
            {tooltip.sector.industries.length > 0 && (
              <p className="mt-1 text-text-muted">
                Top:{" "}
                {tooltip.sector.industries
                  .slice(0, 3)
                  .map((i) => i.name)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expanded sector detail */}
      {expandedSectorData && (
        <div className="bg-surface-2 border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-text-primary">
              {expandedSectorData.name} &mdash; Industries
            </h3>
            <button
              onClick={() => setExpandedSector(null)}
              className="text-[10px] text-text-muted hover:text-text-secondary"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {expandedSectorData.industries.map((industry) => (
              <div
                key={industry.name}
                className="rounded-md p-2 border border-transparent"
                style={{
                  backgroundColor: getCellColor(industry.valueChangePct),
                  minHeight: "50px",
                }}
              >
                <p className="text-[10px] font-medium text-text-primary line-clamp-2 mb-1">
                  {industry.name}
                </p>
                <p className="text-[10px] text-text-secondary">
                  {formatCurrency(industry.totalValue, "USD", true)}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-semibold",
                    industry.valueChangePct > 0
                      ? "text-gain"
                      : industry.valueChangePct < 0
                        ? "text-loss"
                        : "text-text-muted"
                  )}
                >
                  {formatPercent(industry.valueChangePct)}
                </p>
                <p className="text-[9px] text-text-muted mt-0.5">
                  {industry.holdings} holding{industry.holdings !== 1 ? "s" : ""}
                </p>
                {industry.topHoldings.length > 0 && (
                  <p className="text-[9px] text-text-muted mt-0.5 line-clamp-1">
                    {industry.topHoldings.slice(0, 2).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
