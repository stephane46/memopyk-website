/**
 * Error Handling Middleware
 *
 * Centralised error handler, 404 catcher, and async wrapper.
 *
 * Usage (in app.ts — must be registered LAST):
 *   import { errorHandler, notFoundHandler } from './middleware/error.middleware';
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    /** true = expected operational error; false = programming bug */
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ---------------------------------------------------------------------------
// Error handler (4-arg Express signature)
// ---------------------------------------------------------------------------

const isProd = () => process.env.NODE_ENV === "production";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status: number = err.statusCode ?? err.status ?? 500;
  const message: string = err.message || "Internal Server Error";

  // Always log server-side
  console.error(`[Error] ${status} — ${message}`);
  if (!isProd()) console.error(err.stack);

  const body: Record<string, unknown> = { error: message };
  if (!isProd()) body.stack = err.stack;

  res.status(status).json(body);
}

// ---------------------------------------------------------------------------
// 404 handler (register BEFORE errorHandler)
// ---------------------------------------------------------------------------

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Not found: ${req.method} ${req.originalUrl}`, 404));
}

// ---------------------------------------------------------------------------
// Async wrapper
// ---------------------------------------------------------------------------

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/** Wraps an async route handler so rejected promises forward to errorHandler. */
export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
