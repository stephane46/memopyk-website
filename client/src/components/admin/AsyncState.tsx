import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  children: React.ReactNode;
  emptyText?: string;
  loadingText?: string;
  onRetry?: () => void;
}

export function AsyncState({
  loading,
  error,
  hasData,
  children,
  emptyText = "No data for this period.",
  loadingText = "Loading…",
  onRetry,
}: AsyncStateProps) {
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto mb-2"></div>
        <div className="text-sm text-gray-500">{loadingText}</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <div className="text-sm text-red-600 mb-3">Analytics temporarily unavailable</div>
        <div className="text-xs text-gray-500 mb-3">{error}</div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="flex items-center gap-2 mx-auto">
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    );
  }
  
  if (!hasData) {
    return (
      <div className="p-4 text-center">
        <div className="text-sm text-gray-500">{emptyText}</div>
      </div>
    );
  }
  
  return <>{children}</>;
}