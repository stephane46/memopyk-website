import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { formatInt } from "@/utils/format";

type RealtimeData = { 
  activeUsers: number; 
  lastEvents: { eventName: string; count: number }[];
  debug?: {
    totalEvents: number;
    allEvents: { eventName: string; count: number }[];
  };
  error?: string;
};

export function RealtimePanel() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      setIsLoading(true);
      fetch("/api/ga4/realtime")
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(j => { 
          if (alive) {
            setData(j); 
            setError(null);
            setIsLoading(false);
            setLastUpdated(new Date().toLocaleTimeString());
          }
        })
        .catch(e => { 
          if (alive) {
            setError(String(e)); 
            setIsLoading(false);
          }
        });
    };

    load();
    const id = setInterval(load, 15000); // refresh every 15s
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Realtime Activity
            <Activity className="h-5 w-5 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">Realtime error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Realtime Activity
            <Activity className="h-5 w-5 text-green-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading realtime data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Realtime Activity
          <Activity className="h-5 w-5 text-green-500" />
        </CardTitle>
        <div className="text-xs text-gray-500">
          Auto-refresh 15s{lastUpdated && ` • Last updated: ${lastUpdated}`}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Users:</span>
            <Badge variant="default" className="bg-green-600">
              {data.activeUsers === 0 ? "No active viewers" : `${formatInt(data.activeUsers)} live`}
            </Badge>
          </div>
          
          {/* Show error if present */}
          {data.error && (
            <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
              Realtime Error: {data.error}
            </div>
          )}

          {/* Recent Video Events */}
          {(Array.isArray(data.lastEvents) ? data.lastEvents : []).length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">Recent Video Events:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(Array.isArray(data.lastEvents) ? data.lastEvents : []).slice(0, 10).map((event, index) => (
                  <div key={index} className="flex justify-between border-b last:border-b-0 py-1 text-sm">
                    <span className="font-mono text-xs">{event.eventName}</span>
                    <span className="font-medium">{formatInt(event.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">No recent video activity</div>
              
              {/* Debug info - show if there are non-video events */}
              {data.debug && data.debug.totalEvents > 0 && (
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600">
                    Debug: {data.debug.totalEvents} total events (expand to see)
                  </summary>
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto bg-gray-50 p-2 rounded">
                    {data.debug.allEvents.map((event, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="font-mono">{event.eventName}</span>
                        <span>{formatInt(event.count)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}