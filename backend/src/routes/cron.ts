// backend/src/routes/cron.ts
import { Router, Request, Response, NextFunction } from 'express';
import { cronController } from '../controllers/cronController';

export const cronRouter = Router();

// Cron Bearer Authentication Middleware
function cronAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'cron-super-secret-key-12345';

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  next();
}

cronRouter.use(cronAuthMiddleware);

cronRouter.get('/stale-check', (req, res) => cronController.staleCheck(req, res));
cronRouter.get('/weekly-report', (req, res) => cronController.weeklyReport(req, res));
cronRouter.get('/maintenance', (req, res) => cronController.maintenance(req, res));
