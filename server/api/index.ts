// api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server/src/index'; // ודאי שהנתיב הזה נכון לפי המבנה שלך

// הגדרת גרסת Node ל-Vercel כדי למנוע שגיאות Runtime
export const config = {
  runtime: 'nodejs18.x',
};

/**
 * גשר בין מנגנון ה־Serverless Functions של Vercel לבין שרת ה־Express שלך.
 * Express מטפל בכל הראוטים (auth, ping, health וכו’), והפונקציה הזו
 * פשוט מעבירה את הבקשות ל־Express.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-ignore — טיפוסי VercelRequest/VercelResponse לא תואמים לחלוטין ל־Express
  return app(req, res);
}
