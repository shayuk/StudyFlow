import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';

// RFC 7807 Problem Details response shape
interface ProblemDetails {
  type?: string;      // URI reference identifying the problem type
  title: string;      // short, human-readable summary
  status: number;     // HTTP status code
  detail?: string;    // human-readable explanation
  instance?: string;  // URI reference that identifies the specific occurrence
  traceId?: string;   // optional correlation id if available
}

/**
 * Centralized error handler that returns application/json in RFC 7807 problem+json format.
 * Should be the last middleware in the chain (after routes).
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const status = (() => {
    // honor explicit status if present on error objects we throw (e.g., { status: 400 })
    const anyErr = err as any;
    const s = Number(anyErr?.status);
    if (Number.isInteger(s) && s >= 400 && s <= 599) return s;
    return 500;
  })();

  const title = status >= 500 ? 'Internal Server Error' : 'Request Error';
  const detail = (() => {
    if (process.env.NODE_ENV === 'production') return undefined;
    if (err instanceof Error) return err.message;
    return typeof err === 'string' ? err : undefined;
  })();

  // Pull a trace id if httpLogger/request-id middleware attached one
  const traceId = (req as any).id || (req.headers['x-request-id'] as string | undefined);

  const problem: ProblemDetails = {
    type: status >= 500 ? 'about:blank' : 'https://httpstatuses.com/' + status,
    title,
    status,
    detail,
    instance: req.originalUrl,
    ...(traceId ? { traceId } : {}),
  };

  // Log the error with context
  logger.error({ err, status, path: req.originalUrl, traceId }, 'Unhandled error');

  res.setHeader('Content-Type', 'application/problem+json');
  return res.status(status).json(problem);
}
