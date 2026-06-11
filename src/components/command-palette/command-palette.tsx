"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/use-search";
import { useWatchlist } from "@/hooks/use-watchlist";
import { searchResultToInstrument } from "@/lib/instruments";
import { NAV_ITEMS } from "@/components/layout/navigation";
import { InstrumentDetailPanel } from "@/components/instrument-detail/instrument-detail-panel";
import type { Instrument } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";

type PaletteItem =
  | { kind: "page"; label: string; href: string }
  | { kind: "instrument"; section: "Watchlist" | "Search"; instrument: Instrument };

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { instruments } = useWatchlist();
  const { data: searchResults, isLoading } = useSearch(debouncedQuery);

  const openPalette = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Global hotkeys: Ctrl/Cmd+K always, "/" outside inputs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) return false;
          openPalette();
          return true;
        });
      } else if (e.key === "/" && !isEditableTarget(e.target)) {
        e.preventDefault();
        openPalette();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openPalette]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();

    const pages: PaletteItem[] = NAV_ITEMS.filter(
      (item) => q === "" || item.label.toLowerCase().includes(q)
    ).map((item) => ({ kind: "page", label: item.label, href: item.href }));

    const watchlist: PaletteItem[] = instruments
      .filter(
        (i) =>
          q === "" ||
          i.symbol.toLowerCase().includes(q) ||
          i.providerSymbol.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q)
      )
      .map((i) => ({ kind: "instrument", section: "Watchlist", instrument: i }));

    const watchlistSymbols = new Set(instruments.map((i) => i.providerSymbol));
    const search: PaletteItem[] = (searchResults ?? [])
      .filter((r) => !watchlistSymbols.has(r.symbol))
      .map((r) => ({
        kind: "instrument",
        section: "Search",
        instrument: searchResultToInstrument(r),
      }));

    return [...watchlist, ...search, ...pages];
  }, [query, instruments, searchResults]);

  // Clamp at render time so the highlight stays valid when the list shrinks
  const safeIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  // Keep the active item visible
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${safeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [safeIndex]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      if (item.kind === "page") {
        router.push(item.href);
      } else {
        setSelectedInstrument(item.instrument);
      }
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(items.length === 0 ? 0 : (safeIndex + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        items.length === 0 ? 0 : (safeIndex - 1 + items.length) % items.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[safeIndex];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  // Section label shown above the first item of each group
  const sectionOf = (item: PaletteItem) =>
    item.kind === "page" ? "Pages" : item.section;

  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] pointer-events-none">
            <div className="bg-surface-1 border border-border rounded-lg w-full max-w-md shadow-2xl pointer-events-auto">
              <div className="p-4 border-b border-border">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search instruments or jump to a page..."
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                />
              </div>
              <div ref={listRef} className="max-h-[320px] overflow-y-auto">
                {items.map((item, index) => {
                  const section = sectionOf(item);
                  const showHeader = index === 0 || sectionOf(items[index - 1]) !== section;
                  return (
                    <div key={item.kind === "page" ? `page-${item.href}` : `${item.section}-${item.instrument.providerSymbol}`}>
                      {showHeader && (
                        <div className="px-4 pt-2.5 pb-1 text-[10px] text-text-muted uppercase tracking-wider">
                          {section}
                        </div>
                      )}
                      <button
                        data-index={index}
                        onClick={() => handleSelect(item)}
                        onMouseMove={() => setActiveIndex(index)}
                        className={cn(
                          "w-full text-left px-4 py-2 transition-colors",
                          index === safeIndex ? "bg-surface-2" : "hover:bg-surface-2"
                        )}
                      >
                        {item.kind === "page" ? (
                          <span className="text-sm text-text-primary">{item.label}</span>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-text-primary">
                                {item.instrument.symbol}
                              </span>
                              <span className="text-xs text-text-muted ml-2">
                                {item.instrument.exchange}
                              </span>
                            </div>
                            <span className="text-xs text-text-secondary truncate max-w-[200px]">
                              {item.instrument.name}
                            </span>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
                {isLoading && debouncedQuery.length >= 2 && (
                  <div className="px-4 py-3 text-center text-text-muted text-xs">
                    Searching...
                  </div>
                )}
                {items.length === 0 && !isLoading && (
                  <div className="px-4 py-8 text-center text-text-muted text-sm">
                    No matches
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-border text-[10px] text-text-muted flex gap-3">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
                <span>esc close</span>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedInstrument && (
        <InstrumentDetailPanel
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      )}
    </>
  );
}
