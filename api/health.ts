import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: 'ok', service: 'studyflow-server', version: '0.1.0' });
}
