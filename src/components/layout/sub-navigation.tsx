"use client";

import { cn } from "@/lib/utils";

interface SubNavigationProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function SubNavigation({ tabs, activeTab, onTabChange }: SubNavigationProps) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded transition-colors",
            activeTab === tab.key
              ? "text-accent bg-accent/10"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
