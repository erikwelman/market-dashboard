"use client";

import { useState } from "react";
import { useSectorFlow } from "@/hooks/use-sector-flow";
import { SectorHeatmap } from "./sector-heatmap";
import { SectorFlowTable } from "./sector-flow-table";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface SectorHeatmapViewProps {
  ciks: string[];
}

type ViewMode = "heatmap" | "table";

function SectorFlowSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-32 bg-surface-3 rounded" />
        <div className="h-8 w-48 bg-surface-3 rounded" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface-3 rounded"
            style={{ height: `${80 + Math.random() * 60}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SectorHeatmapView({ ciks }: SectorHeatmapViewProps) {
  const [quarter, setQuarter] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");
  const { data, isLoading, error, refetch } = useSectorFlow(ciks, quarter);

  if (ciks.length === 0) {
    return (
      <div className="bg-surface-1 border border-border rounded-lg">
        <EmptyState message="Add investors to view sector flow analysis" />
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Sector Flow
          </h2>
          {data && (
            <p className="text-[10px] text-text-muted mt-0.5">
              {data.quarter} &middot; Aggregated across {ciks.length} investor
              {ciks.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Quarter selector */}
          <input
            type="text"
            placeholder="e.g. 2025-Q4"
            value={quarter || ""}
            onChange={(e) =>
              setQuarter(e.target.value || undefined)
            }
            className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted w-28 focus:outline-none focus:border-accent"
          />

          {/* View toggle */}
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setViewMode("heatmap")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                viewMode === "heatmap"
                  ? "bg-surface-3 text-text-primary"
                  : "bg-surface-2 text-text-muted hover:text-text-secondary"
              )}
            >
              Heatmap
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                viewMode === "table"
                  ? "bg-surface-3 text-text-primary"
                  : "bg-surface-2 text-text-muted hover:text-text-secondary"
              )}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && <SectorFlowSkeleton />}
        {error && (
          <ErrorState
            message="Failed to load sector flow data"
            onRetry={() => refetch()}
          />
        )}
        {data && data.sectors.length === 0 && (
          <EmptyState message="No sector data available for the selected quarter" />
        )}
        {data && data.sectors.length > 0 && (
          <>
            {viewMode === "heatmap" && <SectorHeatmap data={data} />}
            {viewMode === "table" && <SectorFlowTable data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
