"use client";

import { useIsFetching } from "@tanstack/react-query";

export function RefreshStatus() {
  const isFetching = useIsFetching();

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      {isFetching > 0 && (
        <>
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span>Updating...</span>
        </>
      )}
    </div>
  );
}
