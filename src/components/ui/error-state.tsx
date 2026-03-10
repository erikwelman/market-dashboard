interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Failed to load data", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
      <p className="text-sm mb-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
