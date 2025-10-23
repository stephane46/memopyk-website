import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trash2, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { formatFrenchDateTime } from '@/utils/date-format';

interface MaintenanceLog {
  id: string;
  operation_type: string;
  operation_params: Record<string, any>;
  records_affected: number;
  execution_time_ms: number;
  created_at: string;
  operation_details?: Record<string, any>;
}

interface CleanupStatusResponse {
  success: boolean;
  lastCleanup: MaintenanceLog | null;
}

interface CleanupMessage {
  type: 'info' | 'success' | 'error';
  text: string;
}

export function AnalyticsCleanupCard() {
  const [months, setMonths] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<CleanupMessage | null>(null);
  const [lastCleanup, setLastCleanup] = useState<MaintenanceLog | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const { toast } = useToast();

  // Load last cleanup status on component mount
  useEffect(() => {
    loadLastCleanup();
  }, []);

  const loadLastCleanup = async () => {
    try {
      setStatusLoading(true);
      const response = await fetch('/api/analytics/cleanup/status');
      const data: CleanupStatusResponse = await response.json();
      
      if (data.success) {
        setLastCleanup(data.lastCleanup);
      }
    } catch (error) {
      console.error('Failed to load cleanup status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (months < 1 || months > 120) {
      setMessage({ type: 'error', text: 'Months must be between 1 and 120.' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: `Running cleanup for data older than ${months} months...` });

    try {
      const response = await fetch('/api/analytics/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Cleanup failed.' 
        });
        toast({
          title: "Cleanup Failed",
          description: data.error || 'Failed to cleanup analytics data.',
          variant: "destructive",
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: data.message || `Analytics cleanup completed for data older than ${months} months.` 
        });
        toast({
          title: "Cleanup Successful",
          description: `Analytics data older than ${months} months has been cleaned up.`,
        });
        
        // Refresh status after successful cleanup
        await loadLastCleanup();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Network error during cleanup. Please try again.' 
      });
      toast({
        title: "Network Error",
        description: 'Failed to connect to server. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = (type: CleanupMessage['type']) => {
    switch (type) {
      case 'info':
        return <Clock className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getMessageColor = (type: CleanupMessage['type']) => {
    switch (type) {
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Analytics Data Cleanup
        </CardTitle>
        <CardDescription>
          Clean up old analytics data to maintain database performance. This action permanently removes records older than the specified period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Last Cleanup Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Last Cleanup Status</Label>
          {statusLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading status...
            </div>
          ) : lastCleanup ? (
            <div className="p-3 rounded-lg bg-gray-50 border">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatFrenchDateTime(lastCleanup.created_at)}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Records affected:</span> {lastCleanup.records_affected?.toLocaleString() || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Execution time:</span> {lastCleanup.execution_time_ms}ms
                </div>
                {lastCleanup.operation_params?.months && (
                  <div>
                    <span className="font-medium">Retention period:</span> {lastCleanup.operation_params.months} months
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-2 text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4" />
                No cleanup has been performed yet
              </div>
            </div>
          )}
        </div>

        {/* Cleanup Configuration */}
        <div className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="months-input">Retention Period (months)</Label>
            <Input
              id="months-input"
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              min={1}
              max={120}
              placeholder="12"
              disabled={loading}
              data-testid="input-cleanup-months"
            />
            <p className="text-xs text-gray-500">
              Data older than this many months will be permanently deleted (1-120 months)
            </p>
          </div>

          <Button
            onClick={handleCleanup}
            disabled={loading || months < 1 || months > 120}
            variant="destructive"
            className="w-full"
            data-testid="button-run-cleanup"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Cleanup...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Run Cleanup (Delete data older than {months} months)
              </>
            )}
          </Button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 ${getMessageColor(message.type)}`} data-testid="text-cleanup-status">
            {getMessageIcon(message.type)}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Warning */}
        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-700">
              <div className="font-medium mb-1">Warning</div>
              <div>This action permanently deletes analytics data and cannot be undone. Make sure you have exported any data you need before running cleanup.</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}