"use client";

import { useState, useMemo } from "react";
import type { SectorFlow } from "@/lib/alert-types";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface SectorFlowTableProps {
  data: SectorFlow;
}

type SortKey =
  | "name"
  | "totalValue"
  | "valueChange"
  | "valueChangePct"
  | "direction"
  | "holdings";
type SortDir = "asc" | "desc";

const DIRECTION_BADGES: Record<
  string,
  { label: string; className: string }
> = {
  INFLOW: {
    label: "Inflow",
    className: "bg-gain-bg text-gain",
  },
  OUTFLOW: {
    label: "Outflow",
    className: "bg-loss-bg text-loss",
  },
  NEUTRAL: {
    label: "Neutral",
    className: "bg-surface-3 text-text-muted",
  },
};

export function SectorFlowTable({ data }: SectorFlowTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(
    new Set()
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleExpand = (sectorName: string) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorName)) next.delete(sectorName);
      else next.add(sectorName);
      return next;
    });
  };

  const sortedSectors = useMemo(() => {
    const sorted = [...data.sectors];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "totalValue":
          cmp = a.totalValue - b.totalValue;
          break;
        case "valueChange":
          cmp = a.valueChange - b.valueChange;
          break;
        case "valueChangePct":
          cmp = a.valueChangePct - b.valueChangePct;
          break;
        case "direction":
          cmp = a.direction.localeCompare(b.direction);
          break;
        case "holdings": {
          const aH = a.industries.reduce((s, i) => s + i.holdings, 0);
          const bH = b.industries.reduce((s, i) => s + i.holdings, 0);
          cmp = aH - bH;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [data.sectors, sortKey, sortDir]);

  const SortHeader = ({
    label,
    field,
    align = "right",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "right";
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        "text-[10px] uppercase tracking-wider font-medium hover:text-text-primary transition-colors flex items-center gap-1",
        sortKey === field ? "text-text-primary" : "text-text-muted",
        align === "right" && "justify-end"
      )}
    >
      {label}
      {sortKey === field && (
        <span className="text-accent">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
      )}
    </button>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2 w-8" />
            <th className="text-left px-3 py-2">
              <SortHeader label="Sector" field="name" align="left" />
            </th>
            <th className="text-right px-3 py-2">
              <SortHeader label="Value ($)" field="totalValue" />
            </th>
            <th className="text-right px-3 py-2">
              <SortHeader label="Change ($)" field="valueChange" />
            </th>
            <th className="text-right px-3 py-2">
              <SortHeader label="Change (%)" field="valueChangePct" />
            </th>
            <th className="text-center px-3 py-2">
              <SortHeader label="Direction" field="direction" />
            </th>
            <th className="text-right px-3 py-2">
              <SortHeader label="# Holdings" field="holdings" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSectors.map((sector) => {
            const isExpanded = expandedSectors.has(sector.name);
            const totalHoldings = sector.industries.reduce(
              (s, i) => s + i.holdings,
              0
            );
            const badge = DIRECTION_BADGES[sector.direction];

            return (
              <>
                <tr
                  key={sector.name}
                  onClick={() => toggleExpand(sector.name)}
                  className="border-b border-border hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 text-text-muted">
                    <span
                      className={cn(
                        "inline-block transition-transform text-[10px]",
                        isExpanded && "rotate-90"
                      )}
                    >
                      &#9654;
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-primary font-medium">
                    {sector.name}
                  </td>
                  <td className="px-3 py-2 text-right text-text-secondary">
                    {formatCurrency(sector.totalValue, "USD", true)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right",
                      sector.valueChange > 0
                        ? "text-gain"
                        : sector.valueChange < 0
                          ? "text-loss"
                          : "text-text-muted"
                    )}
                  >
                    {formatCurrency(sector.valueChange, "USD", true)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right",
                      sector.valueChangePct > 0
                        ? "text-gain"
                        : sector.valueChangePct < 0
                          ? "text-loss"
                          : "text-text-muted"
                    )}
                  >
                    {formatPercent(sector.valueChangePct)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-medium",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-text-secondary">
                    {totalHoldings}
                  </td>
                </tr>

                {/* Expanded industry rows */}
                {isExpanded &&
                  sector.industries.map((industry) => (
                    <tr
                      key={`${sector.name}-${industry.name}`}
                      className="bg-surface-2 border-b border-border/50"
                    >
                      <td className="px-3 py-1.5" />
                      <td className="px-3 py-1.5 pl-8 text-text-secondary text-[11px]">
                        {industry.name}
                      </td>
                      <td className="px-3 py-1.5 text-right text-text-muted text-[11px]">
                        {formatCurrency(industry.totalValue, "USD", true)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5 text-right text-[11px]",
                          industry.valueChange > 0
                            ? "text-gain"
                            : industry.valueChange < 0
                              ? "text-loss"
                              : "text-text-muted"
                        )}
                      >
                        {formatCurrency(industry.valueChange, "USD", true)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5 text-right text-[11px]",
                          industry.valueChangePct > 0
                            ? "text-gain"
                            : industry.valueChangePct < 0
                              ? "text-loss"
                              : "text-text-muted"
                        )}
                      >
                        {formatPercent(industry.valueChangePct)}
                      </td>
                      <td className="px-3 py-1.5" />
                      <td className="px-3 py-1.5 text-right text-text-muted text-[11px]">
                        {industry.holdings}
                      </td>
                    </tr>
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
