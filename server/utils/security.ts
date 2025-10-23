import type { Request, Response, NextFunction } from "express";

const bucket = new Map<string, { count: number; ts: number }>();

export function rateLimit(maxPerMin = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    const key = ip || "unknown";
    const now = Date.now();
    const item = bucket.get(key) || { count: 0, ts: now };
    
    if (now - item.ts > 60_000) {
      item.count = 0;
      item.ts = now;
    }
    
    item.count++;
    bucket.set(key, item);
    
    if (item.count > maxPerMin) {
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }
    
    next();
  };
}

export function verifyCsrf(req: Request): boolean {
  const cookie = req.cookies?.csrfToken;
  const token = (req.body && req.body.csrfToken) || req.headers["x-csrf-token"];
  return typeof cookie === "string" && cookie.length > 8 && cookie === token;
}

export async function verifyCaptcha(_token: string): Promise<boolean> {
  // TODO: integrate reCAPTCHA/Turnstile server verify here.
  return true;
}
