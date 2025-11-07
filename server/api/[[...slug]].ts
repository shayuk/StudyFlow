import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './index';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};

export default function all(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
