// backend/src/__tests__/integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db, initDb } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { GOOGLE_SESSION_COOKIE_NAME } from '@/core/session';

describe('PatchPilot Standalone Express Backend API Tests', () => {
  let authCookie: string;

  beforeAll(async () => {
    initDb();

    // Ensure a default project exists for webhooks and incident creation
    const existing = await db.select().from(projects).where(eq(projects.id, 'proj_main')).get();
    if (!existing) {
      const now = new Date().toISOString();
      await db.insert(projects).values({
        id: 'proj_main',
        name: 'Default Test Project',
        repoOwner: 'patchpilot',
        repoName: 'core-system',
        defaultBranch: 'main',
        sandboxProvider: 'fake',
        createdAt: now,
        updatedAt: now
      });
    }
  });

  describe('1. Health Check', () => {
    it('GET /health returns healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'patchpilot-backend');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('2. Authentication & Session Lifecycle', () => {
    it('GET /api/auth/session returns unauthenticated when no cookie provided', async () => {
      const res = await request(app).get('/api/auth/session');
      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
      expect(res.body.user).toBeNull();
    });

    it('GET /api/auth/dev-login generates encrypted session and sets cookie', async () => {
      const res = await request(app).get('/api/auth/dev-login?returnUrl=/');
      expect(res.status).toBe(302);
      expect(res.header['location']).toBe('/');

      const rawCookies = res.header['set-cookie'];
      expect(rawCookies).toBeDefined();
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      const sessionCookie = cookies.find((c: string) => c.startsWith(`${GOOGLE_SESSION_COOKIE_NAME}=`));
      expect(sessionCookie).toBeDefined();

      // Extract raw cookie value for subsequent requests
      authCookie = sessionCookie!.split(';')[0];
    });

    it('GET /api/auth/session returns authenticated user profile with valid session cookie', async () => {
      const res = await request(app)
        .get('/api/auth/session')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('nebiyu@patchpilot.io');
      expect(res.body.user.name).toBe('Nebiyu Musbah');
      expect(res.body.user.role).toBe('admin');
    });

    it('GET /api/auth/google/logout clears the session cookie', async () => {
      const res = await request(app)
        .get('/api/auth/google/logout')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const rawCookies = res.header['set-cookie'];
      expect(rawCookies).toBeDefined();
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      expect(cookies.some((c: string) => c.includes(`${GOOGLE_SESSION_COOKIE_NAME}=;`))).toBe(true);
    });
  });

  describe('3. GitHub OAuth Endpoints', () => {
    it('GET /api/auth/github/status returns status schema', async () => {
      const res = await request(app).get('/api/auth/github/status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('configured');
      expect(res.body).toHaveProperty('connected');
    });

    it('POST /api/auth/github/disconnect clears session and returns success', async () => {
      const res = await request(app).post('/api/auth/github/disconnect');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/github/config rejects missing credentials with 400', async () => {
      const res = await request(app).post('/api/auth/github/config').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('GET /api/auth/github/repos returns 401 when not connected to GitHub', async () => {
      const originalToken = process.env.GITHUB_TOKEN;
      process.env.GITHUB_TOKEN = '';
      try {
        const res = await request(app).get('/api/auth/github/repos');
        expect(res.status).toBe(401);
      } finally {
        process.env.GITHUB_TOKEN = originalToken;
      }
    });
  });

  describe('4. Protected Incident Management Endpoints', () => {
    it('GET /api/incidents returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/incidents');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('GET /api/incidents returns list of incidents when authenticated', async () => {
      const res = await request(app)
        .get('/api/incidents')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('incidents');
      expect(Array.isArray(res.body.incidents)).toBe(true);
    });

    it('GET /api/incidents/:id returns 404 for nonexistent incident', async () => {
      const res = await request(app)
        .get('/api/incidents/nonexistent-id')
        .set('Cookie', authCookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Incident not found');
    });
  });

  describe('5. Project Management Endpoints', () => {
    it('GET /api/projects returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });

    it('GET /api/projects returns project list when authenticated', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projects');
      expect(Array.isArray(res.body.projects)).toBe(true);
    });

    it('POST /api/projects creates a new project with policy when authenticated', async () => {
      const uniqueName = `Project-${Date.now().toString(36)}`;
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', authCookie)
        .send({
          name: uniqueName,
          repoOwner: 'patchpilot-org',
          repoName: 'test-service',
          defaultBranch: 'main'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.project.name).toBe(uniqueName);
      expect(res.body.project.repo).toBe('patchpilot-org/test-service');
      expect(res.body.webhookUrls).toHaveProperty('sentry');
      expect(res.body.webhookUrls).toHaveProperty('githubActions');
      expect(res.body.webhookUrls).toHaveProperty('generic');
    });

    it('POST /api/projects fails with 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', authCookie)
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('6. Stats & Metrics Endpoints', () => {
    it('GET /api/stats returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(401);
    });

    it('GET /api/stats returns metrics when authenticated', async () => {
      const res = await request(app)
        .get('/api/stats')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('metrics');
      expect(res.body).toHaveProperty('categoryData');
      expect(res.body.metrics).toHaveProperty('totalIncidents');
      expect(res.body.metrics).toHaveProperty('fixPassRate');
    });
  });

  describe('7. Cron Bearer Authenticated Endpoints', () => {
    const cronSecret = process.env.CRON_SECRET || 'cron-super-secret-key-12345';

    it('GET /api/cron/stale-check rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/cron/stale-check');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized cron request');
    });

    it('GET /api/cron/stale-check succeeds with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/cron/stale-check')
        .set('Authorization', `Bearer ${cronSecret}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job).toBe('stale-check');
      expect(res.body).toHaveProperty('staleCount');
    });

    it('GET /api/cron/weekly-report succeeds with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/cron/weekly-report')
        .set('Authorization', `Bearer ${cronSecret}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job).toBe('weekly-report');
      expect(res.body.report).toHaveProperty('totalIncidents');
      expect(res.body.report).toHaveProperty('passRatePercent');
    });

    it('GET /api/cron/maintenance succeeds with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/cron/maintenance')
        .set('Authorization', `Bearer ${cronSecret}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job).toBe('maintenance');
      expect(res.body).toHaveProperty('processedMergedCount');
    });
  });

  describe('8. Webhook Ingest Endpoints', () => {
    it('POST /api/webhooks/generic processes generic webhook payloads successfully', async () => {
      const res = await request(app)
        .post('/api/webhooks/generic?projectId=proj_main')
        .set('Content-Type', 'application/json')
        .send({
          title: 'Memory leak in worker pool',
          errorType: 'OutOfMemoryError',
          errorMessage: 'Heap limit reached in worker thread',
          environment: 'production'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.processed).toBe(1);
    });

    it('POST /api/webhooks/generic returns 401 when signature check fails in production mode', async () => {
      const prevEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      try {
        const res = await request(app)
          .post('/api/webhooks/generic?projectId=proj_main')
          .set('Content-Type', 'application/json')
          .set('x-patchpilot-signature', 'invalid-hex-signature-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
          .send({ title: 'Test alert' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid webhook signature');
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
      }
    });

    it('POST /api/webhooks/github-actions returns 401 on missing signature in production mode', async () => {
      const prevEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      try {
        const res = await request(app)
          .post('/api/webhooks/github-actions?projectId=proj_main')
          .set('Content-Type', 'application/json')
          .send({ action: 'completed' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid HMAC signature');
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
      }
    });

    it('POST /api/webhooks/sentry returns 401 on missing signature in production mode', async () => {
      const prevEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      try {
        const res = await request(app)
          .post('/api/webhooks/sentry?projectId=proj_main')
          .set('Content-Type', 'application/json')
          .send({ id: 'sentry-1' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid HMAC signature');
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
      }
    });
  });
});
