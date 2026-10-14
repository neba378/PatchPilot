// backend/src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { incidentsRouter } from './routes/incidents';
import { projectsRouter } from './routes/projects';
import { statsRouter } from './routes/stats';
import { webhooksRouter } from './routes/webhooks';
import { cronRouter } from './routes/cron';
import { evalRouter } from './routes/eval';
import { authMiddleware } from './middleware/auth';
import { logger } from '@/core/logger';

export function createApp(): Express {
  const app = express();

  // 1. CORS Configuration supporting Next.js front-end
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin rewrites)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-email', 'x-user-role', 'x-user-name']
  }));

  // 2. Cookie parser
  app.use(cookieParser());

  // 3. Body parsers with rawBody retention for webhook HMAC signature checks
  app.use(express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  app.use(express.urlencoded({ extended: true }));

  app.use(express.text({
    type: ['text/*', 'application/webhook+json'],
    verify: (req: Request, _res: Response, buf: Buffer) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  // 4. Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'patchpilot-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // 5. Mount API Routes with Auth Middleware
  // Auth middleware protects all routes except public auth, webhooks, and cron
  app.use('/api', authMiddleware);

  app.use('/api/auth', authRouter);
  app.use('/api/incidents', incidentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/cron', cronRouter);
  app.use('/api/eval', evalRouter);

  // 6. Centralized 404 handler
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // 7. Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ error: err.message, stack: err.stack }, '[Express] Unhandled server error');
    res.status(500).json({
      error: err.message || 'Internal server error'
    });
  });

  return app;
}

export const app = createApp();
