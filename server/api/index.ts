// server/api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/index';  // נכון למבנה: server/api -> server/src

// קיבוע ה־runtime עבור פונקציית ה־Vercel (יציב)
export const config = {
  runtime: 'nodejs18.x',
};

/**
 * גשר בין Serverless Functions של Vercel לבין אפליקציית ה-Express שלך.
 * כל הראוטים מוגדרים בתוך server/src/index.ts; כאן רק מעבירים את הבקשה.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-ignore – טיפוסים שונים (Vercel/Express) אך זה עובד בפועל
  return app(req, res);
}
