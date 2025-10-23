import fixture from "./__fixtures__/phase3.json";

export function getMockReport(report: string, videoId?: string) {
  // Add timestamp and cached flags like the real API
  const baseResponse = {
    timestamp: new Date().toISOString(),
    cached: false
  };

  switch (report) {
    case "kpis":
      return { 
        kpis: fixture.kpis,
        ...baseResponse
      };
      
    case "topVideos":
      return { 
        topVideos: fixture.topVideos,
        ...baseResponse
      };
      
    case "videoFunnel":
      if (videoId && fixture.videoFunnel.videoId === videoId) {
        return { 
          funnel: fixture.videoFunnel.funnel,
          ...baseResponse
        };
      }
      // Return empty funnel for unknown videos
      return { 
        funnel: [
          { bucket: 10, count: 0 },
          { bucket: 25, count: 0 },
          { bucket: 50, count: 0 },
          { bucket: 75, count: 0 },
          { bucket: 90, count: 0 }
        ] as Array<{ bucket: 10|25|50|75|90, count: number }>,
        ...baseResponse
      };
      
    default:
      throw new Error(`Unknown report type: ${report}`);
  }
}