export function SkeletonCard() {
  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="h-4 w-20 bg-surface-3 rounded mb-2" />
          <div className="h-6 w-28 bg-surface-3 rounded" />
        </div>
        <div className="h-5 w-16 bg-surface-3 rounded" />
      </div>
      <div className="h-[200px] bg-surface-2 rounded" />
    </div>
  );
}
