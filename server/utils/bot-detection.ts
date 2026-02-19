/**
 * Bot Detection Utility
 *
 * Identifies bot/crawler user agents to filter them from analytics data.
 */

const BOT_PATTERNS = [
  // Generic patterns
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /mediapartners/i,

  // Specific bots
  /AhrefsBot/i,
  /Googlebot/i,
  /bingbot/i,
  /Applebot/i,
  /360Spider/i,
  /YandexBot/i,
  /Baiduspider/i,
  /DuckDuckBot/i,
  /Sogou/i,
  /PetalBot/i,
  /SemrushBot/i,
  /MJ12bot/i,
  /DotBot/i,
  /GoogleOther/i,
  /Google-InspectionTool/i,

  // Tools and libraries
  /\bcurl\b/i,
  /\bwget\b/i,
  /python-requests/i,
  /Go-http-client/i,
  /Java\//i,
  /\baxios\b/i,
  /node-fetch/i,
  /HeadlessChrome/i,
  /Lighthouse/i,
  /PageSpeed/i,
];

/**
 * Check if a user agent string belongs to a bot or crawler.
 * Returns true for bots, empty/missing user agents.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim() === '') {
    return true;
  }

  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}
