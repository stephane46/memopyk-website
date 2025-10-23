// server/services/ga4Client.ts
// A single entry point to GA4's RunReport with mock fallback.

const GA4_MOCK = process.env.GA4_MOCK === 'true';
console.info('[GA4] mode:', process.env.GA4_MOCK, 'property:', process.env.GA4_PROPERTY_ID);

// GA4_MOCK now reads from environment variable
// GA4_MOCK=false for live GA4 data, GA4_MOCK=true for mock data

// ---- Types (minimal) ----
type RunReportRequest = {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: any; // GA4 expression
  metricFilter?: any;
  orderBys?: any[];
  limit?: number | string;
};

type RunReportResponse = {
  rows?: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
};

// ---- PUBLIC API ----
export async function runGa4Report(payload: RunReportRequest): Promise<RunReportResponse> {
  console.log(`🔍 GA4 Client Mode: GA4_MOCK=${GA4_MOCK}, Property: ${process.env.GA4_PROPERTY_ID}`);
  if (GA4_MOCK) {
    console.log('📋 Using mock data (GA4_MOCK=true)');
    return runGa4ReportMock(payload);
  }
  console.log('🌐 Using live GA4 data (GA4_MOCK=false)');
  return runGa4ReportReal(payload);
}

// Metadata API function to check custom dimensions
export async function checkGa4CustomDimensions(): Promise<{[key: string]: boolean}> {
  if (GA4_MOCK) {
    return { video_id: true, video_title: true, progress_percent: true };
  }
  
  try {
    const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
    const client = new BetaAnalyticsDataClient({
      credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY!)
    });
    
    const [response] = await client.getMetadata({
      name: `properties/${process.env.GA4_PROPERTY_ID}/metadata`
    });
    
    const customDimensions = response.dimensions?.filter(
      d => d.apiName?.startsWith('customEvent:')
    ) || [];
    
    const found = {
      video_id: customDimensions.some(d => d.apiName === 'customEvent:video_id'),
      video_title: customDimensions.some(d => d.apiName === 'customEvent:video_title'), 
      progress_percent: customDimensions.some(d => d.apiName === 'customEvent:progress_percent')
    };
    
    console.log('🔍 GA4 Custom Dimensions Found:', found);
    return found;
  } catch (error) {
    console.error('❌ Failed to check GA4 custom dimensions:', error);
    return { video_id: false, video_title: false, progress_percent: false };
  }
}

// =========================
// MOCK IMPLEMENTATION
// =========================

function pickMetricValue(metricName: string, base = 100): string {
  // naive generator for stable-ish numbers
  const hash = [...metricName].reduce((a, c) => a + c.charCodeAt(0), 0);
  return String(base + (hash % 37));
}

function* dateRangeDays(startISO: string, endISO: string) {
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    yield `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
  }
}

function mockRowsForDates(metrics: string[], startISO: string, endISO: string) {
  const rows: RunReportResponse["rows"] = [];
  for (const day of dateRangeDays(startISO, endISO)) {
    rows!.push({
      dimensionValues: [{ value: day }],
      metricValues: metrics.map((m) => ({ value: pickMetricValue(m, m === "sessions" ? 120 : 90) })),
    });
  }
  return rows!;
}

function mockRowsForTopVideos(metrics: string[]) {
  // Three videos, with fake counts
  const vids = [
    { id: "vid001", title: "Birthday Highlights" },
    { id: "vid002", title: "Wedding Film" },
    { id: "vid003", title: "Travel Memories" },
  ];
  return vids.map((v, i) => ({
    dimensionValues: [{ value: v.id }, { value: v.title }],
    metricValues: metrics.map(() => ({ value: String(300 - i * 60) })), // 300,240,180
  }));
}

function mockRowsForFunnel() {
  const buckets = ["10", "25", "50", "75", "90"];
  const counts = [280, 220, 160, 120, 170]; // note: not strictly monotonic to reflect real data noise
  return buckets.map((b, i) => ({
    dimensionValues: [{ value: b }],
    metricValues: [{ value: String(counts[i]) }],
  }));
}

async function runGa4ReportMock(payload: RunReportRequest): Promise<RunReportResponse> {
  const { dateRanges, dimensions = [], metrics } = payload;
  const [range] = dateRanges;
  const dimNames = dimensions.map((d) => d.name);

  // Very small router based on requested dimensions
  if (dimNames.length === 1 && dimNames[0] === "date") {
    return { rows: mockRowsForDates(metrics.map((m) => m.name), range.startDate, range.endDate) };
  }

  if (
    dimNames.length === 2 &&
    dimNames[0] === "customEvent:video_id" &&
    dimNames[1] === "customEvent:video_title"
  ) {
    return { rows: mockRowsForTopVideos(metrics.map((m) => m.name)) };
  }

  if (dimNames.length === 1 && dimNames[0] === "customEvent:progress_percent") {
    return { rows: mockRowsForFunnel() };
  }

  // Fallback: empty
  return { rows: [] };
}

// =========================
// REAL IMPLEMENTATION
// =========================

async function runGa4ReportReal(payload: RunReportRequest): Promise<RunReportResponse> {
  const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
  
  const client = new BetaAnalyticsDataClient({
    credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY!)
  });
  
  try {
    const [response] = await client.runReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      ...payload
    });
    
    // Log first few dimension values to confirm real data
    if (response.rows && response.rows.length > 0) {
      console.log('🔍 GA4 Real Data Sample - First row dimensions:', 
        response.rows[0].dimensionValues?.slice(0, 2).map(d => d.value));
    }
    
    return response;
  } catch (error: any) {
    // Enhanced error handling - pass through GA4 error details
    console.error('🚨 GA4 API Error Details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      metadata: error.metadata
    });
    
    // Check for missing custom dimension errors
    if (error.code === 3 && error.message && error.message.includes('INVALID_ARGUMENT')) {
      const missingDimensions = checkForMissingCustomDimensions(error.message, payload);
      if (missingDimensions.length > 0) {
        const customError = new Error(
          `Missing GA4 custom dimension${missingDimensions.length > 1 ? 's' : ''}: ${missingDimensions.join(', ')} (event-scoped). Create ${missingDimensions.length > 1 ? 'them' : 'it'} in GA4 Admin → Custom definitions.`
        );
        (customError as any).code = 'MISSING_CUSTOM_DIMENSION';
        (customError as any).statusCode = 400;
        (customError as any).missingDimensions = missingDimensions;
        throw customError;
      }
    }
    
    // Pass through the original error with enhanced details
    const enhancedError = new Error(`GA4 API Error (${error.code}): ${error.message || 'Unknown error'}`);
    (enhancedError as any).code = error.code;
    (enhancedError as any).originalError = error;
    throw enhancedError;
  }
}

// Helper function to detect missing custom dimensions
function checkForMissingCustomDimensions(errorMessage: string, payload: RunReportRequest): string[] {
  const missing: string[] = [];
  const customDimensions = ['video_id', 'video_title', 'progress_percent'];
  
  // Check if any custom dimensions are used in the query
  const usedCustomDims = payload.dimensions?.filter(d => d.name.startsWith('customEvent:')) || [];
  
  for (const dim of usedCustomDims) {
    const paramName = dim.name.replace('customEvent:', '');
    if (customDimensions.includes(paramName)) {
      // This is a heuristic - GA4 error messages don't always clearly specify which dimension is missing
      // But if we're using a custom dimension and getting INVALID_ARGUMENT, it's likely missing
      missing.push(paramName);
    }
  }
  
  return missing;
}