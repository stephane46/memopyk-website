import crypto from "crypto";

type ZohoTokenState = { accessToken: string; expiry: number };

const baseUrl = process.env.ZOHO_BASE_URL || "";
const authUrl = process.env.ZOHO_AUTH_URL || "";
const clientId = process.env.ZOHO_CLIENT_ID || "";
const clientSecret = process.env.ZOHO_CLIENT_SECRET || "";
const refreshToken = process.env.ZOHO_REFRESH_TOKEN || "";

if (!baseUrl || !authUrl || !clientId || !clientSecret || !refreshToken) {
  console.warn("⚠️ Zoho env vars not configured - partner intake will fail");
}

let tokenState: ZohoTokenState | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh 5 minutes (300 seconds) before expiry, just like Python code
  if (tokenState && now < tokenState.expiry - 300_000) return tokenState.accessToken;
  
  console.log("🔐 ZOHO: Token missing, expired or nearing expiry. Refreshing...");
  
  // Build query parameters (matching Python's requests.post with params=)
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  
  const tokenUrl = `${authUrl}?${params.toString()}`;
  
  console.log("🔐 ZOHO: Requesting token from:", authUrl);
  console.log("🔐 ZOHO: Using client_id:", clientId.substring(0, 10) + "...");
  
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error("❌ ZOHO AUTH FAILED:", {
      status: res.status,
      statusText: res.statusText,
      authUrl,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken,
      response: text.substring(0, 300)
    });
    throw new Error(`Zoho token refresh failed: ${res.status} ${res.statusText}. Check your OAuth credentials.`);
  }
  
  const json: any = await res.json();
  
  if (!json.access_token) {
    console.error("❌ ZOHO: No access_token in response:", json);
    throw new Error(`Zoho token response missing access_token: ${json.error || 'Unknown error'}`);
  }
  
  const expiresIn = json.expires_in || 3600;
  const expirySeconds = expiresIn - 300; // 5-minute buffer
  
  tokenState = {
    accessToken: json.access_token,
    expiry: Date.now() + (expirySeconds * 1000),
  };
  
  console.log(`✅ ZOHO: Token refreshed successfully. Expires in ~${(expirySeconds / 60).toFixed(1)} minutes`);
  
  return tokenState.accessToken;
}

export async function zohoFetch(path: string, init?: RequestInit & { json?: any }) {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Zoho-oauthtoken ${token}`,
  };
  
  let body: BodyInit | undefined;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  
  const res = await fetch(url, { 
    ...init, 
    headers: { ...headers, ...(init?.headers || {}) }, 
    body 
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho API ${res.status} ${url}: ${text}`);
  }
  
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export function randomId(prefix = "req_") {
  return prefix + crypto.randomBytes(8).toString("hex");
}
