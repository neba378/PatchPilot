import express from 'express';
import * as Sentry from '@sentry/node';
import { handleCheckout } from './paymentController';

const app = express();
const PORT = process.env.PORT || 4000;

const sentryDsn = process.env.SENTRY_DSN || '';
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    release: 'checkout-service@1.0.0',
    tracesSampleRate: 1.0,
  });
  console.log('✅ Sentry initialized with DSN:', sentryDsn.replace(/:[^@]+@/, ':***@'));
} else {
  console.log('⚠️ SENTRY_DSN not provided. Running in local mode without Sentry export.');
}

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Checkout endpoint: Triggers the TypeError when body.metadata is omitted or null
app.post('/checkout', async (req, res) => {
  try {
    await handleCheckout(req as any, res);
  } catch (err: any) {
    console.error('💥 [Server Error] Caught exception in /checkout:', err.message);
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
  console.log(`🚀 Checkout API Service running on http://localhost:${PORT}`);
  console.log(`➡️  POST http://localhost:${PORT}/checkout to test`);
});
