import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { Skeleton } from "@/components/ui/skeleton";

type ORSession = {
  id: string;
  startedAt: number;
  duration: number;
  userId?: string;
  metadata?: Record<string, string>;
  pages?: Array<{ path: string }>;
};

const PROJECT_UI_BASE = "https://app.openreplay.com";

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function fmtDur(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

export default function SessionReplaysCard() {
  const { filters } = React.useContext(GlobalFilterContext);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // For now, show a message about OpenReplay Cloud setup
  const projectKey = import.meta.env.VITE_OPENREPLAY_PROJECT_KEY;
  const videoAnalyticsEnabled = import.meta.env.VITE_VIDEO_ANALYTICS_ENABLED === "true";

  if (!videoAnalyticsEnabled || !projectKey) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Session Replays & Heatmaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mb-2">Session Recording Ready</p>
            <p className="text-sm text-muted-foreground mb-4">
              OpenReplay is initialized to capture user sessions automatically
            </p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`${PROJECT_UI_BASE}/sessions`, '_blank')}
              >
                View Sessions in OpenReplay
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`${PROJECT_UI_BASE}/heatmaps`, '_blank')}
              >
                View Heatmaps
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Session Replays & Heatmaps</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`${PROJECT_UI_BASE}/sessions`, '_blank')}
          >
            View Sessions
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`${PROJECT_UI_BASE}/heatmaps`, '_blank')}
          >
            Heatmaps
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mb-2">Session Recording Active</p>
          <p className="text-sm text-muted-foreground mb-4">
            User sessions are being recorded automatically.<br/>
            Sessions will appear in your OpenReplay Cloud dashboard after a few minutes.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-blue-900 mb-2">🎬 What's Being Captured:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• User mouse movements and clicks</li>
              <li>• Page scrolling and interactions</li>
              <li>• Form inputs (masked for privacy)</li>
              <li>• Navigation patterns</li>
              <li>• Session duration and performance</li>
              <li>• GA4 integration for cross-reference</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}