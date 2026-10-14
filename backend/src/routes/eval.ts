// backend/src/routes/eval.ts
import { Router } from 'express';
import { evalController } from '../controllers/evalController';

export const evalRouter = Router();

evalRouter.get('/latest', (req, res) => evalController.getLatest(req, res));
evalRouter.post('/run', (req, res) => evalController.runEval(req, res));
