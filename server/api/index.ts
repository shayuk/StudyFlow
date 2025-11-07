// server/api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/index';  // <<< זה הנכון במבנה שלך

export const config = { runtime: 'nodejs18.x' };

export default function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-ignore – טיפוסים שונים אבל עובד בפועל
  return app(req, res);
}
