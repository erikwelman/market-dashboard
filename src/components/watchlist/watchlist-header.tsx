interface WatchlistHeaderProps {
  onAddClick: () => void;
}

export function WatchlistHeader({ onAddClick }: WatchlistHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <h2 className="text-sm font-semibold text-text-primary">Watchlist</h2>
      <button
        onClick={onAddClick}
        className="text-xs text-accent hover:text-accent-hover font-medium transition-colors px-2 py-1 rounded hover:bg-surface-3"
      >
        + Add
      </button>
    </div>
  );
}
