// backend/src/routes/stats.ts
import { Router } from 'express';
import { statsController } from '../controllers/statsController';

export const statsRouter = Router();

statsRouter.get('/', (req, res) => statsController.getStats(req, res));
