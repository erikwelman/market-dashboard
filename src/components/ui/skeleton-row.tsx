export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      <div className="flex-1">
        <div className="h-4 w-16 bg-surface-3 rounded mb-1" />
        <div className="h-3 w-32 bg-surface-3 rounded" />
      </div>
      <div className="h-4 w-20 bg-surface-3 rounded" />
      <div className="h-4 w-16 bg-surface-3 rounded" />
      <div className="h-[40px] w-[120px] bg-surface-2 rounded" />
    </div>
  );
}
