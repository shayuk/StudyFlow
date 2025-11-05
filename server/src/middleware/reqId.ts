import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
export default function reqId(req: Request, res: Response, next: NextFunction) {
  const id = randomUUID().slice(0, 8);
  (res.locals as any).reqId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
