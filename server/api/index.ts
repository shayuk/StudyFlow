// server/api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/index';  // נכון למבנה: server/api -> server/src

// קיבוע ה־runtime עבור פונקציית ה־Vercel (יציב)
export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};

/**
 * גשר בין Serverless Functions של Vercel לבין אפליקציית ה-Express שלך.
 * כל הראוטים מוגדרים בתוך server/src/index.ts; כאן רק מעבירים את הבקשה.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS at Vercel level for all preview deployments
  const origin = req.headers.origin;
  
  // Allow all Vercel deployments and localhost
  if (origin && (
    origin.includes('.vercel.app') || 
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // @ts-ignore – טיפוסים שונים (Vercel/Express) אך זה עובד בפועל
  return app(req, res);
}
