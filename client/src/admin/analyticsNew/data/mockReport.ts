import fixture from "../__fixtures__/phase3.json";
import type {
  ReportParams,
  KpisResponse,
  TopVideosResponse,
  VideoFunnelResponse,
  ProgressBucket,
  TopVideoRow
} from "./types";

const emptyTrend = [{ date: "", value: 0 }];

export function mockReport(params: ReportParams):
  KpisResponse | TopVideosResponse | VideoFunnelResponse {
  const { report, videoId } = params;

  const baseResponse = {
    timestamp: new Date().toISOString(),
    cached: false
  };

  if (report === "kpis") {
    return {
      kpis: {
        ...fixture.kpis,
        totalViews: { value: 0, trend: emptyTrend },
        uniqueVisitors: { value: 0, trend: emptyTrend },
        returnVisitors: { value: 0, trend: emptyTrend },
      },
      ...baseResponse
    };
  }

  if (report === "topVideos") {
    const topVideos: TopVideoRow[] = fixture.topVideos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      views: v.plays,
      uniqueViewers: v.completions,
      averageWatchTime: v.avgEngagement,
      completionRate: v.completionRate,
      engagement: v.avgEngagement,
      plays: v.plays,
      completions: v.completions,
      avgEngagement: v.avgEngagement,
    }));
    return {
      topVideos,
      ...baseResponse
    };
  }

  if (report === "videoFunnel") {
    if (!videoId) {
      return {
        funnel: [],
        ...baseResponse
      };
    }

    if (fixture.videoFunnel.videoId === videoId) {
      return {
        funnel: fixture.videoFunnel.funnel.map((f) => ({
          bucket: f.bucket as ProgressBucket,
          count: f.count,
        })),
        ...baseResponse
      };
    }

    // Return empty funnel for unknown videos
    return {
      funnel: [
        { bucket: 10 as const, count: 0 },
        { bucket: 25 as const, count: 0 },
        { bucket: 50 as const, count: 0 },
        { bucket: 75 as const, count: 0 },
        { bucket: 90 as const, count: 0 }
      ],
      ...baseResponse
    };
  }

  throw new Error(`Unknown report type: ${report}`);
}