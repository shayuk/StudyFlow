import { Router, Response } from 'express';
import { authMiddleware } from '../auth/middleware';
import type { AuthedRequest } from '../auth/middleware';

const router = Router();

router.get('/me', authMiddleware, (req: AuthedRequest, res: Response) => {
  return res.status(200).json({ user: req.user });
});

export default router;
