// server/middleware/parseGa4Query.ts
import { Request, Response, NextFunction } from "express";
import { dateRangeFromQuery, Ga4Parsed } from "../utils/dateRangeFromQuery";

declare global {
  // Augment Express locals for TypeScript
  namespace Express {
    interface Locals {
      ga4?: Ga4Parsed;
    }
  }
}

export function parseGa4Query(req: Request, res: Response, next: NextFunction) {
  try {
    res.locals.ga4 = dateRangeFromQuery(req.query);
    next();
  } catch (err: any) {
    const status = err.status || 400;
    res.status(status).json({ error: err.message || "Bad Request" });
  }
}