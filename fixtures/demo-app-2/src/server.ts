import express from 'express';
import * as Sentry from '@sentry/node';
import { handleCreateOrder } from './orderController';

const app = express();
const PORT = process.env.PORT || 4001;

const sentryDsn = process.env.SENTRY_DSN || '';
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    release: 'order-service@1.0.0',
    tracesSampleRate: 1.0,
  });
  console.log('✅ Sentry initialized with DSN:', sentryDsn.replace(/:[^@]+@/, ':***@'));
} else {
  console.log('⚠️ SENTRY_DSN not provided. Running in local mode without Sentry export.');
}

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service', timestamp: new Date().toISOString() });
});

// Create order endpoint: Triggers TypeError when body.discount is omitted or null
app.post('/orders', async (req, res) => {
  try {
    await handleCreateOrder(req as any, res);
  } catch (err: any) {
    console.error('💥 [Server Error] Caught exception in /orders:', err.message);
    if (sentryDsn) {
      Sentry.captureException(err);
      await Sentry.flush(2000);
      console.log('📡 Exception transmitted to Sentry successfully.');
    }
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Order Fulfillment API Service running on http://localhost:${PORT}`);
  console.log(`➡️  POST http://localhost:${PORT}/orders to test`);
});
