"use client";

import { cn } from "@/lib/utils";
import { ALL_RANGES } from "@/lib/market-data/range-config";
import type { TimeRange } from "@/lib/market-data/types";

interface RangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  compact?: boolean;
}

export function RangeSelector({ selected, onSelect, compact }: RangeSelectorProps) {
  const ranges = compact
    ? (["1D", "1M", "1Y", "5Y"] as TimeRange[])
    : ALL_RANGES;

  return (
    <div className="flex gap-1">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onSelect(range)}
          className={cn(
            "px-2 py-1 text-xs rounded font-medium transition-colors",
            selected === range
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
