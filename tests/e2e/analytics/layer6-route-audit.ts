/**
 * Layer 6: Static Route Mapper + Response Shape Validator
 *
 * Run with: npx tsx tests/e2e/analytics/layer6-route-audit.ts
 *
 * STEP 1: Extract backend routes from server/routes/ files
 * STEP 2: Extract frontend API calls from client/src/ files
 * STEP 3: Match and report mismatches
 * STEP 4: Write route-audit-report.md
 * STEP 5: Exit with error if any mismatches
 * STEP 6: Hit staging endpoints + validate response shapes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '../../..');
const SERVER_ROUTES_DIR = path.join(ROOT, 'server/routes');
const CLIENT_SRC_DIR = path.join(ROOT, 'client/src');
const ROUTES_TS = path.join(ROOT, 'server/routes.ts');
const REPORT_PATH = path.join(__dirname, 'route-audit-report.md');
const STAGING_BASE = 'https://memopyk.memopyk.com';
const TODAY = new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackendRoute {
  method: string;
  pattern: string; // full path with /api prefix
  file: string;
  line: number;
}

interface FrontendCall {
  method: string;
  urlPattern: string; // extracted URL, may have template variable placeholders
  file: string;
  line: number;
}

interface MatchResult {
  frontendUrl: string;
  backendPattern: string | null;
  matched: boolean;
  file: string;
  line: number;
}

interface ShapeCheckResult {
  endpoint: string;
  status: 'pass' | 'fail' | 'blocked';
  httpStatus?: number;
  reason?: string;
  checks?: string[];
}

// ---------------------------------------------------------------------------
// STEP 1: Extract backend routes
// ---------------------------------------------------------------------------

/**
 * Parse mount prefix for each route module from server/routes.ts
 */
function parseMountPrefixes(): Map<string, string> {
  const mountMap = new Map<string, string>();
  if (!fs.existsSync(ROUTES_TS)) return mountMap;

  const content = fs.readFileSync(ROUTES_TS, 'utf-8');
  const lines = content.split('\n');

  // e.g. app.use("/api", analyticsRoutes)  →  "analyticsRoutes" → "/api"
  // e.g. app.use("/api/partners", partnersRoutes)  →  "partnersRoutes" → "/api/partners"
  for (const line of lines) {
    const m = line.match(/app\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)/);
    if (m) {
      mountMap.set(m[2], m[1]);
    }
    // app.use(routerVar) — no prefix (paths baked in)
    const mNaked = line.match(/app\.use\((\w+)\)/);
    if (mNaked) {
      mountMap.set(mNaked[1], '');
    }
  }
  return mountMap;
}

/**
 * Determine which import name corresponds to which route file.
 * Handles both default and named exports.
 */
function parseImports(): Map<string, string> {
  const importMap = new Map<string, string>(); // varName → filename stem (without .ts)
  if (!fs.existsSync(ROUTES_TS)) return importMap;

  const content = fs.readFileSync(ROUTES_TS, 'utf-8');
  const lines = content.split('\n');
  for (const line of lines) {
    // import defaultExport from "./routes/foo.routes"
    const mDefault = line.match(/import\s+(\w+)\s*(?:,\s*\{[^}]+\})?\s+from\s+["'`]\.\/(routes\/[^"'`]+)["'`]/);
    if (mDefault) {
      importMap.set(mDefault[1], mDefault[2]);
    }
    // Named exports: import fooRoutes, { heroTextRouter } from "./routes/hero.routes"
    const mNamed = line.match(/import\s+\w+\s*,\s*\{\s*([^}]+)\s*\}\s+from\s+["'`]\.\/(routes\/[^"'`]+)["'`]/);
    if (mNamed) {
      const namedExports = mNamed[1].split(',').map(s => s.trim());
      for (const exportName of namedExports) {
        importMap.set(exportName, mNamed[2]);
      }
    }
    // import { default as foo, ... }
    const m2 = line.match(/import\s+\{[^}]*default\s+as\s+(\w+)[^}]*\}\s+from\s+["'`]\.\/(routes\/[^"'`]+)["'`]/);
    if (m2) {
      importMap.set(m2[1], m2[2]);
    }
  }
  return importMap;
}

/**
 * Extract all router.get/router.post/router.put/router.delete/router.patch definitions
 * from a route file.
 */
/**
 * Extract routes from a file for a SPECIFIC router variable name.
 * routerVarName: which Router() variable to look for (e.g. 'router', 'heroTextRouter')
 * mountPrefix: the prefix this router is mounted at (e.g. '/api/hero-text')
 */
function extractRoutesFromFile(
  filePath: string,
  mountPrefix: string,
  routerVarName: string = 'router'
): BackendRoute[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const routes: BackendRoute[] = [];

  // Escape the variable name for use in regex
  const escaped = routerVarName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const routeRegex = new RegExp(`${escaped}\\.(get|post|put|delete|patch)\\(\\s*["'\`]([^"'\`]+)["'\`]`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(routeRegex);
    if (m) {
      const method = m[1].toUpperCase();
      const localPath = m[2];
      // If localPath is just '/', the full path is the mountPrefix itself
      const fullPath = localPath === '/' ? mountPrefix : mountPrefix + localPath;
      routes.push({
        method,
        pattern: fullPath,
        file: path.relative(ROOT, filePath),
        line: i + 1,
      });
    }
  }
  return routes;
}

/**
 * Determine the router variable name to scan for a given import name.
 * For named exports (e.g. heroTextRouter), the var name IS the export name.
 * For default exports (e.g. heroRoutes → default export = 'router'), use 'router'.
 */
function getRouterVarName(importVarName: string, fileStem: string): string {
  // Check if this is a named export (not a default export alias)
  // Heuristic: if the import name ends with 'Router' or contains 'Router', it's a named export
  if (importVarName.toLowerCase().includes('router') && importVarName !== 'router') {
    return importVarName;
  }
  return 'router';
}

function extractAllBackendRoutes(): BackendRoute[] {
  const mountPrefixes = parseMountPrefixes();
  const importMap = parseImports();
  const routes: BackendRoute[] = [];

  // Also add routes defined directly in server/index.ts (app.get)
  const indexFile = path.join(ROOT, 'server/index.ts');
  if (fs.existsSync(indexFile)) {
    const content = fs.readFileSync(indexFile, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/app\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/);
      if (m) {
        routes.push({
          method: m[1].toUpperCase(),
          pattern: m[2],
          file: 'server/index.ts',
          line: i + 1,
        });
      }
    }
  }

  // Process each route module
  const routeFiles = fs.readdirSync(SERVER_ROUTES_DIR).filter(f => f.endsWith('.ts'));
  const processedFiles = new Set<string>();

  for (const [varName, fileStem] of importMap.entries()) {
    const prefix = mountPrefixes.get(varName) ?? '/api';
    const fileName = fileStem.replace('routes/', '') + '.ts';
    const filePath = path.join(SERVER_ROUTES_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const routerVar = getRouterVarName(varName, fileStem);
      const fileRoutes = extractRoutesFromFile(filePath, prefix, routerVar);
      routes.push(...fileRoutes);
      processedFiles.add(fileName);
    }
  }

  // Also scan any route files not caught by import parsing (fallback)
  for (const file of routeFiles) {
    if (!processedFiles.has(file)) {
      const filePath = path.join(SERVER_ROUTES_DIR, file);
      const fileRoutes = extractRoutesFromFile(filePath, '/api', 'router');
      routes.push(...fileRoutes);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return routes.filter(r => {
    const key = `${r.method}:${r.pattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// STEP 2: Extract frontend API calls
// ---------------------------------------------------------------------------

function walkDir(dir: string, ext: string[]): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Normalise a URL string extracted from source code:
 * - Strip query strings: /api/foo?bar=1 → /api/foo
 * - Replace template literal holes: /api/foo/${id} → /api/foo/:param
 * - Strip trailing slashes
 */
function normaliseUrl(raw: string): string {
  // Remove query string
  let url = raw.split('?')[0];
  // Replace ${...} template parts with :param
  url = url.replace(/\$\{[^}]+\}/g, ':param');
  // Replace trailing slash
  url = url.replace(/\/$/, '');
  return url;
}

function extractFrontendCalls(files: string[]): FrontendCall[] {
  const calls: FrontendCall[] = [];

  // Patterns we look for:
  // 1. fetch('/api/...')
  // 2. fetch(`/api/...`)
  // 3. apiRequest('/api/...')
  // 4. adminFetch('/api/...')
  // 5. queryKey: ['/api/...']  (react-query)
  // 6. useQuery({ queryKey: ['/api/...'] })
  // 7. '/api/...' as standalone string (used in fetch-like patterns)

  const urlRegexes = [
    // fetch("url", ...) or fetch(`url`, ...)
    /(?:fetch|apiRequest|adminFetch)\(\s*["'`](\/api\/[^"'`\s]+)["'`]/g,
    // queryKey: ['/api/...' ...] — first element
    /queryKey\s*:\s*\[\s*["'`](\/api\/[^"'`\s]+)["'`]/g,
    // Direct string assignment like: const url = '/api/...'
    /(?:url|endpoint|path)\s*=\s*["'`](\/api\/[^"'`\s]+)["'`]/g,
    // Template literal fetch(`/api/${id}/...`)
    /(?:fetch|apiRequest|adminFetch)\(\s*`(\/api\/[^`\s]+)`/g,
  ];

  // HTTP method detection helpers
  const methodRegexes: Array<{ pattern: RegExp; method: string }> = [
    { pattern: /method\s*:\s*["'`](GET)["'`]/i, method: 'GET' },
    { pattern: /method\s*:\s*["'`](POST)["'`]/i, method: 'POST' },
    { pattern: /method\s*:\s*["'`](PUT)["'`]/i, method: 'PUT' },
    { pattern: /method\s*:\s*["'`](DELETE)["'`]/i, method: 'DELETE' },
    { pattern: /method\s*:\s*["'`](PATCH)["'`]/i, method: 'PATCH' },
    { pattern: /apiRequest\([^,]+,\s*["'`](GET|POST|PUT|DELETE|PATCH)["'`]/i, method: 'DYNAMIC' },
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      for (const regex of urlRegexes) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(line)) !== null) {
          const rawUrl = match[1];
          const normUrl = normaliseUrl(rawUrl);

          // Try to detect HTTP method from surrounding context (3 lines)
          const context = lines.slice(Math.max(0, lineNum - 1), lineNum + 3).join(' ');
          let method = 'GET'; // default

          // apiRequest(url, "METHOD") pattern
          const apiReqMatch = context.match(/apiRequest\([^,]+,\s*["'`](GET|POST|PUT|DELETE|PATCH)["'`]/i);
          if (apiReqMatch) {
            method = apiReqMatch[1].toUpperCase();
          } else {
            for (const { pattern } of methodRegexes) {
              const mm = context.match(pattern);
              if (mm) {
                method = mm[1].toUpperCase();
                break;
              }
            }
          }

          calls.push({
            method,
            urlPattern: normUrl,
            file: path.relative(ROOT, file),
            line: lineNum + 1,
          });
        }
      }
    }
  }

  // Deduplicate by urlPattern+method
  const seen = new Set<string>();
  return calls.filter(c => {
    const key = `${c.method}:${c.urlPattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// STEP 3: Match frontend calls to backend routes
// ---------------------------------------------------------------------------

/**
 * Check if a frontend URL matches a backend route pattern.
 * Handles dynamic segments: /api/posts/:id matches /api/posts/123
 */
function urlMatchesPattern(url: string, pattern: string): boolean {
  if (url === pattern) return true;

  // Normalise both
  const urlParts = url.split('/').filter(Boolean);
  const patParts = pattern.split('/').filter(Boolean);

  if (urlParts.length !== patParts.length) return false;

  for (let i = 0; i < patParts.length; i++) {
    const pPart = patParts[i];
    const uPart = urlParts[i];
    // Backend uses :param, frontend uses :param or any concrete value
    if (pPart.startsWith(':') || uPart === ':param') continue;
    if (pPart !== uPart) return false;
  }
  return true;
}

function matchRoutes(
  frontendCalls: FrontendCall[],
  backendRoutes: BackendRoute[]
): { results: MatchResult[]; unmatchedBackend: BackendRoute[] } {
  const results: MatchResult[] = [];
  const matchedBackendKeys = new Set<string>();

  for (const call of frontendCalls) {
    // Try to find a matching backend route
    // We relax method matching: a GET frontend call can match a backend route
    // (sometimes react-query uses GET implicitly for reads)
    let matched: BackendRoute | null = null;

    // First try exact method match
    for (const route of backendRoutes) {
      if (
        (route.method === call.method || call.method === 'GET') &&
        urlMatchesPattern(call.urlPattern, route.pattern)
      ) {
        matched = route;
        matchedBackendKeys.add(`${route.method}:${route.pattern}`);
        break;
      }
    }

    // If not found by method, try any method match
    if (!matched) {
      for (const route of backendRoutes) {
        if (urlMatchesPattern(call.urlPattern, route.pattern)) {
          matched = route;
          matchedBackendKeys.add(`${route.method}:${route.pattern}`);
          break;
        }
      }
    }

    results.push({
      frontendUrl: call.urlPattern,
      backendPattern: matched ? matched.pattern : null,
      matched: matched !== null,
      file: call.file,
      line: call.line,
    });
  }

  const unmatchedBackend = backendRoutes.filter(
    r => !matchedBackendKeys.has(`${r.method}:${r.pattern}`)
  );

  return { results, unmatchedBackend };
}

// ---------------------------------------------------------------------------
// STEP 6: Response shape validation (staging)
// ---------------------------------------------------------------------------

interface ShapeCheck {
  endpoint: string;
  description: string;
  validate: (body: unknown) => string[]; // returns list of failures
}

const shapeChecks: ShapeCheck[] = [
  {
    endpoint: '/api/analytics/health',
    description: 'Analytics health endpoint',
    validate: (body: unknown) => {
      const failures: string[] = [];
      if (typeof body !== 'object' || body === null) {
        return ['Response is not an object'];
      }
      const b = body as Record<string, unknown>;
      if (!('success' in b)) failures.push('Missing field: success');
      if (!('analytics_db_enabled' in b)) failures.push('Missing field: analytics_db_enabled');
      if (!('ga4_configured' in b)) failures.push('Missing field: ga4_configured');
      return failures;
    },
  },
  {
    endpoint: '/api/analytics/blog/popular?days=30',
    description: 'Blog popular posts analytics',
    validate: (body: unknown) => {
      const failures: string[] = [];
      if (!Array.isArray(body)) {
        return ['Response is not an array'];
      }
      if (body.length > 0) {
        const item = body[0] as Record<string, unknown>;
        if (!('postSlug' in item) && !('page_url' in item)) {
          failures.push('First item missing postSlug or page_url field');
        }
      }
      return failures;
    },
  },
  {
    endpoint: '/api/analytics/blog/categories?days=30',
    description: 'Blog categories analytics',
    validate: (body: unknown) => {
      const failures: string[] = [];
      if (!Array.isArray(body)) {
        return ['Response is not an array'];
      }
      if (body.length > 0) {
        const item = body[0] as Record<string, unknown>;
        if (!('category' in item)) {
          failures.push('First item missing category field');
        }
      }
      return failures;
    },
  },
  {
    endpoint: '/api/ga4/trend?startDate=20260201&endDate=20260220&dataSource=memopyk',
    description: 'GA4 trend data (memopyk source)',
    validate: (body: unknown) => {
      const failures: string[] = [];
      if (typeof body !== 'object' || body === null) {
        return ['Response is not an object'];
      }
      const b = body as Record<string, unknown>;
      if (!('dailyData' in b)) failures.push('Missing field: dailyData');
      if (!('periodAggregates' in b)) failures.push('Missing field: periodAggregates');
      return failures;
    },
  },
  {
    endpoint: '/api/ga4/top-videos?period=30d',
    description: 'GA4 top videos',
    validate: (body: unknown) => {
      const failures: string[] = [];
      if (typeof body !== 'object' || body === null) {
        return ['Response is not an object'];
      }
      const b = body as Record<string, unknown>;
      if (!('topVideos' in b)) {
        failures.push('Missing field: topVideos');
        return failures;
      }
      const topVideos = b['topVideos'] as unknown[];
      if (!Array.isArray(topVideos)) {
        failures.push('topVideos is not an array');
        return failures;
      }
      if (topVideos.length > 0) {
        const first = topVideos[0] as Record<string, unknown>;
        if (!('completions' in first)) {
          failures.push('topVideos[0] missing completions field');
        }
      }
      return failures;
    },
  },
];

async function runShapeChecks(): Promise<ShapeCheckResult[]> {
  const results: ShapeCheckResult[] = [];

  for (const check of shapeChecks) {
    const url = `${STAGING_BASE}${check.endpoint}`;
    console.log(`  Checking: ${check.endpoint}`);

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 401 || response.status === 403) {
        results.push({
          endpoint: check.endpoint,
          status: 'blocked',
          httpStatus: response.status,
          reason: `Auth required (HTTP ${response.status}) — skipping shape validation`,
        });
        continue;
      }

      if (!response.ok) {
        results.push({
          endpoint: check.endpoint,
          status: 'fail',
          httpStatus: response.status,
          reason: `HTTP ${response.status} — ${response.statusText}`,
        });
        continue;
      }

      const body = await response.json();
      const failures = check.validate(body);

      results.push({
        endpoint: check.endpoint,
        status: failures.length === 0 ? 'pass' : 'fail',
        httpStatus: response.status,
        checks: failures,
        reason: failures.length > 0 ? failures.join('; ') : undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        endpoint: check.endpoint,
        status: 'fail',
        reason: `Fetch error: ${message}`,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// STEP 4: Write report
// ---------------------------------------------------------------------------

function writeReport(
  backendRoutes: BackendRoute[],
  frontendCalls: FrontendCall[],
  matchResults: MatchResult[],
  unmatchedBackend: BackendRoute[],
  shapeResults: ShapeCheckResult[]
): void {
  const matched = matchResults.filter(r => r.matched);
  const mismatches = matchResults.filter(r => !r.matched);

  const shapePassed = shapeResults.filter(r => r.status === 'pass');
  const shapeFailed = shapeResults.filter(r => r.status === 'fail');
  const shapeBlocked = shapeResults.filter(r => r.status === 'blocked');

  const lines: string[] = [
    `## Route Audit Report — ${TODAY}`,
    '',
    `**Backend routes found:** ${backendRoutes.length}`,
    `**Frontend API calls found:** ${frontendCalls.length}`,
    `**Shape checks performed:** ${shapeResults.length}`,
    '',
    '---',
    '',
    `### ✅ Matched routes (${matched.length})`,
    '',
    ...matched.map(r => `- \`${r.frontendUrl}\` → \`${r.backendPattern}\` *(${r.file}:${r.line})*`),
    '',
    '---',
    '',
    `### ❌ Mismatches — ERRORS (${mismatches.length})`,
    '',
    mismatches.length === 0
      ? '_No mismatches found._'
      : mismatches.map(r =>
          `- **ERROR** Frontend calls \`${r.frontendUrl}\` but no matching backend route found *(${r.file}:${r.line})*`
        ).join('\n'),
    '',
    '---',
    '',
    `### ⚠️ Unused backend routes — WARNINGS (${unmatchedBackend.length})`,
    '',
    unmatchedBackend.length === 0
      ? '_All backend routes have at least one matching frontend call._'
      : unmatchedBackend.map(r =>
          `- \`${r.method} ${r.pattern}\` *(${r.file}:${r.line})*`
        ).join('\n'),
    '',
    '---',
    '',
    `### 🔍 Response Shape Validation (staging: ${STAGING_BASE})`,
    '',
    `**Passed:** ${shapePassed.length}  **Failed:** ${shapeFailed.length}  **Blocked (auth):** ${shapeBlocked.length}`,
    '',
    ...shapeResults.map(r => {
      const icon = r.status === 'pass' ? '✅' : r.status === 'blocked' ? '⚠️' : '❌';
      const detail = r.reason ? ` — ${r.reason}` : r.checks?.length === 0 ? ' — all checks passed' : '';
      const httpStr = r.httpStatus ? ` [HTTP ${r.httpStatus}]` : '';
      return `${icon} \`${r.endpoint}\`${httpStr}${detail}`;
    }),
    '',
    '---',
    '',
    '### Full Backend Route List',
    '',
    ...backendRoutes.map(r => `- \`${r.method} ${r.pattern}\` *(${r.file}:${r.line})*`),
  ];

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`\nReport written to: ${REPORT_PATH}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Layer 6: Route Audit + Shape Validator ===\n');

  // STEP 1
  console.log('STEP 1: Extracting backend routes...');
  const backendRoutes = extractAllBackendRoutes();
  console.log(`  Found ${backendRoutes.length} backend routes\n`);

  // STEP 2
  console.log('STEP 2: Extracting frontend API calls...');
  const clientFiles = walkDir(CLIENT_SRC_DIR, ['.ts', '.tsx']);
  const frontendCalls = extractFrontendCalls(clientFiles);
  console.log(`  Scanned ${clientFiles.length} client files`);
  console.log(`  Found ${frontendCalls.length} unique frontend API calls\n`);

  // STEP 3
  console.log('STEP 3: Matching frontend calls to backend routes...');
  const { results: matchResults, unmatchedBackend } = matchRoutes(frontendCalls, backendRoutes);
  const matched = matchResults.filter(r => r.matched);
  const mismatches = matchResults.filter(r => !r.matched);
  console.log(`  Matched: ${matched.length}`);
  console.log(`  Mismatched (ERRORS): ${mismatches.length}`);
  console.log(`  Unused backend routes (WARNINGS): ${unmatchedBackend.length}\n`);

  if (mismatches.length > 0) {
    console.log('  ❌ MISMATCHES:');
    for (const m of mismatches) {
      console.log(`     ${m.frontendUrl} (${m.file}:${m.line})`);
    }
    console.log('');
  }

  // STEP 6
  console.log('STEP 6: Running response shape validation on staging...');
  let shapeResults: ShapeCheckResult[] = [];
  try {
    shapeResults = await runShapeChecks();
    const passed = shapeResults.filter(r => r.status === 'pass').length;
    const failed = shapeResults.filter(r => r.status === 'fail').length;
    const blocked = shapeResults.filter(r => r.status === 'blocked').length;
    console.log(`  Passed: ${passed}, Failed: ${failed}, Blocked: ${blocked}\n`);

    for (const r of shapeResults) {
      const icon = r.status === 'pass' ? '✅' : r.status === 'blocked' ? '⚠️' : '❌';
      const httpStr = r.httpStatus ? ` [${r.httpStatus}]` : '';
      console.log(`  ${icon} ${r.endpoint}${httpStr}${r.reason ? ' — ' + r.reason : ''}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  Could not reach staging: ${message}`);
    shapeResults = shapeChecks.map(c => ({
      endpoint: c.endpoint,
      status: 'blocked',
      reason: `Network unreachable: ${message}`,
    }));
  }
  console.log('');

  // STEP 4
  console.log('STEP 4: Writing report...');
  writeReport(backendRoutes, frontendCalls, matchResults, unmatchedBackend, shapeResults);

  // STEP 5
  const shapeFailed = shapeResults.filter(r => r.status === 'fail');
  const hasErrors = mismatches.length > 0 || shapeFailed.length > 0;

  console.log('\n=== Summary ===');
  console.log(`Backend routes:     ${backendRoutes.length}`);
  console.log(`Frontend calls:     ${frontendCalls.length}`);
  console.log(`Matched:            ${matched.length}`);
  console.log(`Mismatches:         ${mismatches.length} ${mismatches.length > 0 ? '❌' : '✅'}`);
  console.log(`Unused backend:     ${unmatchedBackend.length} (warnings)`);
  console.log(`Shape checks:       ${shapeResults.length}`);
  console.log(`Shape passed:       ${shapeResults.filter(r => r.status === 'pass').length}`);
  console.log(`Shape failed:       ${shapeFailed.length} ${shapeFailed.length > 0 ? '❌' : '✅'}`);
  console.log(`Shape blocked:      ${shapeResults.filter(r => r.status === 'blocked').length} (auth/network)`);

  if (hasErrors) {
    console.log('\n❌ AUDIT FAILED — see report for details');
    process.exit(1);
  } else {
    console.log('\n✅ AUDIT PASSED');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
