"use client";

import { useState, useMemo } from "react";
import { useEarningsCalendar } from "@/hooks/use-earnings";
import type { Instrument } from "@/lib/market-data/types";
import type { EarningsData } from "@/lib/alert-types";
import { cn } from "@/lib/utils";
import { EarningsTable } from "@/components/research/earnings-table";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

type ViewMode = "calendar" | "list";

interface EarningsCalendarViewProps {
  symbols: string[];
  instruments: Instrument[];
  onSelectInstrument: (instrument: Instrument) => void;
}

export function EarningsCalendarView({
  symbols,
  instruments,
  onSelectInstrument,
}: EarningsCalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { data, isLoading, isError, refetch } = useEarningsCalendar(symbols);

  if (isLoading) return <EarningsCalendarSkeleton />;
  if (isError)
    return (
      <ErrorState message="Failed to load earnings calendar" onRetry={refetch} />
    );
  if (!data || data.length === 0)
    return <EmptyState message="No earnings data available for watchlist stocks" />;

  const watchlistSymbols = new Set(instruments.map((i) => i.providerSymbol));

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Earnings Calendar
        </h3>
        <div className="flex bg-surface-2 rounded-lg p-0.5">
          <button
            className={cn(
              "px-3 py-1 text-xs rounded-md transition-colors",
              viewMode === "list"
                ? "bg-surface-3 text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
          <button
            className={cn(
              "px-3 py-1 text-xs rounded-md transition-colors",
              viewMode === "calendar"
                ? "bg-surface-3 text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
            onClick={() => setViewMode("calendar")}
          >
            Calendar
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <EarningsTable
          earningsData={data}
          instruments={instruments}
          onSelectInstrument={onSelectInstrument}
        />
      ) : (
        <CalendarGrid
          earningsData={data}
          instruments={instruments}
          watchlistSymbols={watchlistSymbols}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSelectInstrument={onSelectInstrument}
        />
      )}
    </div>
  );
}

interface CalendarGridProps {
  earningsData: EarningsData[];
  instruments: Instrument[];
  watchlistSymbols: Set<string>;
  month: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
  onSelectInstrument: (instrument: Instrument) => void;
}

function CalendarGrid({
  earningsData,
  instruments,
  watchlistSymbols,
  month,
  onMonthChange,
  onSelectInstrument,
}: CalendarGridProps) {
  const earningsByDate = useMemo(() => {
    const map = new Map<string, Array<{ symbol: string; companyName: string }>>();

    for (const ed of earningsData) {
      if (ed.nextEarningsDate) {
        const key = ed.nextEarningsDate;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({
          symbol: ed.symbol,
          companyName: ed.companyName,
        });
      }
    }

    return map;
  }, [earningsData]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(month.year, month.month, 1);
    const lastDay = new Date(month.year, month.month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: Array<{
      date: number | null;
      dateStr: string;
      isToday: boolean;
    }> = [];

    // Padding days
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, dateStr: "", isToday: false });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(month.year, month.month, d);
      const dateStr = dateObj.toISOString().split("T")[0];
      days.push({
        date: d,
        dateStr,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [month]);

  const monthName = new Date(month.year, month.month).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  const prevMonth = () => {
    onMonthChange(
      month.month === 0
        ? { year: month.year - 1, month: 11 }
        : { year: month.year, month: month.month - 1 }
    );
  };

  const nextMonth = () => {
    onMonthChange(
      month.month === 11
        ? { year: month.year + 1, month: 0 }
        : { year: month.year, month: month.month + 1 }
    );
  };

  const findInstrument = (symbol: string) =>
    instruments.find(
      (i) => i.symbol === symbol || i.providerSymbol === symbol
    );

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="text-text-muted hover:text-text-primary transition-colors px-2 py-1 text-sm"
        >
          &larr;
        </button>
        <span className="text-sm font-medium text-text-primary">
          {monthName}
        </span>
        <button
          onClick={nextMonth}
          className="text-text-muted hover:text-text-primary transition-colors px-2 py-1 text-sm"
        >
          &rarr;
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-[10px] text-text-muted text-center py-1 font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {calendarDays.map((day, idx) => {
          const earnings = day.dateStr
            ? earningsByDate.get(day.dateStr) ?? []
            : [];
          const hasEarnings = earnings.length > 0;

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[60px] p-1 rounded text-xs",
                day.date == null && "opacity-0",
                day.date != null && "bg-surface-2",
                day.isToday && "ring-1 ring-accent",
                hasEarnings && "cursor-pointer hover:bg-surface-3"
              )}
            >
              {day.date != null && (
                <>
                  <div
                    className={cn(
                      "text-[10px] mb-0.5",
                      day.isToday
                        ? "text-accent font-medium"
                        : "text-text-muted"
                    )}
                  >
                    {day.date}
                  </div>
                  {earnings.map((e) => {
                    const isWatchlist = watchlistSymbols.has(e.symbol);
                    return (
                      <button
                        key={e.symbol}
                        className={cn(
                          "block w-full text-left text-[9px] px-0.5 py-px rounded truncate transition-colors",
                          isWatchlist
                            ? "bg-accent/20 text-accent hover:bg-accent/30"
                            : "bg-surface-3 text-text-secondary hover:bg-border"
                        )}
                        onClick={() => {
                          const inst = findInstrument(e.symbol);
                          if (inst) onSelectInstrument(inst);
                        }}
                        title={`${e.symbol} - ${e.companyName}`}
                      >
                        {e.symbol}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EarningsCalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-surface-3 rounded animate-pulse" />
        <div className="h-7 w-28 bg-surface-3 rounded animate-pulse" />
      </div>
      <div className="bg-surface-1 border border-border rounded-lg p-4">
        <div className="h-4 w-40 bg-surface-3 rounded animate-pulse mx-auto mb-4" />
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[60px] bg-surface-2 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
