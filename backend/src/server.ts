// backend/src/server.ts
import 'dotenv/config';
import { app } from './app';
import { initDb } from '@/db';
import { logger } from '@/core/logger';

const PORT = Number(process.env.BACKEND_PORT || (process.env.PORT && process.env.PORT !== '3000' ? process.env.PORT : 4000)) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure SQLite database tables are properly initialized
initDb();

const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 PatchPilot Backend Server running on http://${HOST}:${PORT}`);
  logger.info(`👉 Health check: http://${HOST}:${PORT}/health`);
  logger.info(`👉 API routes: http://${HOST}:${PORT}/api`);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down backend gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { server };
