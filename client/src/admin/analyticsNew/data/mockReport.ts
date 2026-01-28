import fixture from "../__fixtures__/phase3.json";
import type {
  ReportParams,
  KpisResponse,
  TopVideosResponse,
  VideoFunnelResponse
} from "./types";

export function mockReport(params: ReportParams):
  KpisResponse | TopVideosResponse | VideoFunnelResponse {
  const { report, videoId } = params;

  const baseResponse = {
    timestamp: new Date().toISOString(),
    cached: false
  };

  if (report === "kpis") {
    return { 
      kpis: fixture.kpis,
      ...baseResponse
    };
  }
  
  if (report === "topVideos") {
    return { 
      topVideos: fixture.topVideos,
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
        funnel: fixture.videoFunnel.funnel,
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