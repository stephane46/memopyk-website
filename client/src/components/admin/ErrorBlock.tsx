export function ErrorBlock({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`p-4 ${compact ? "text-sm" : ""} rounded-lg border border-red-200 bg-red-50 text-red-700`}>
      <div className="flex items-center justify-between gap-3">
        <span>{message || "Something went wrong."}</span>
        {onRetry && (
          <button
            className="px-3 py-1 rounded bg-white border border-red-300 text-red-700 hover:bg-red-100"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}