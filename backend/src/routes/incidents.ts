// backend/src/routes/incidents.ts
import { Router, Request, Response } from 'express';
import { db } from '@/db';
import { incidents, investigations, fixAttempts, pullRequests, postmortems } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { executeSandboxFix } from '@/core/sandboxFixPipeline';
import { buildInvestigationContext } from '@/core/contextBuilder';
import { runInvestigation } from '@/agents/investigator';
import { logger } from '@/core/logger';

export const incidentsRouter = Router();

// GET /api/incidents - List all incidents
incidentsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const list = await db.select().from(incidents).orderBy(desc(incidents.detectedAt));
    return res.json({ incidents: list });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Incidents] List failed');
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/:id - Get incident details with related records
incidentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const incident = await db.select().from(incidents).where(eq(incidents.id, id)).get();
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const investigation = await db.select().from(investigations).where(eq(investigations.incidentId, id)).get();
    const fixAttempt = await db.select().from(fixAttempts).where(eq(fixAttempts.incidentId, id)).get();
    const pr = await db.select().from(pullRequests).where(eq(pullRequests.incidentId, id)).get();
    const postmortem = await db.select().from(postmortems).where(eq(postmortems.incidentId, id)).get();

    return res.json({
      incident,
      investigation,
      fixAttempt,
      pullRequest: pr,
      postmortem
    });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Incidents] Get detail failed');
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/incidents/:id/action - Human-in-the-loop action (accept/reject/snooze)
incidentsRouter.post('/:id/action', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { action } = req.body || {};

    const incident = await db.select().from(incidents).where(eq(incidents.id, id)).get();
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    if (action === 'accept') {
      logger.info({ incidentId: id }, '[IncidentAction] Human accepted fix request. Triggering sandbox fix pipeline');

      let investigation = await db.select().from(investigations).where(eq(investigations.incidentId, id)).get();
      if (!investigation) {
        const ctx = await buildInvestigationContext(incident as any);
        const invResult = await runInvestigation(ctx);
        await db.insert(investigations).values({
          id: `INV-${Date.now().toString(36)}`,
          incidentId: id,
          hypotheses: JSON.stringify(invResult.hypotheses),
          rootCauses: JSON.stringify(invResult.rootCauses),
          affectedFiles: JSON.stringify(invResult.affectedFiles),
          confidenceScore: invResult.confidenceScore,
          createdAt: new Date().toISOString()
        });
        investigation = {
          ...invResult,
          hypotheses: JSON.stringify(invResult.hypotheses),
          rootCauses: JSON.stringify(invResult.rootCauses),
          affectedFiles: JSON.stringify(invResult.affectedFiles)
        } as any;
      }

      const parsedInv = {
        ...investigation,
        hypotheses: typeof investigation!.hypotheses === 'string' ? JSON.parse(investigation!.hypotheses) : investigation!.hypotheses,
        rootCauses: typeof investigation!.rootCauses === 'string' ? JSON.parse(investigation!.rootCauses) : investigation!.rootCauses,
        affectedFiles: typeof investigation!.affectedFiles === 'string' ? JSON.parse(investigation!.affectedFiles) : investigation!.affectedFiles,
        confidenceScore: investigation!.confidenceScore || 90,
        fixable: true,
        riskLevel: 'low' as const,
        noiseIgnored: []
      };

      const fixResult = await executeSandboxFix(incident as any, parsedInv as any, true);
      return res.json({ success: fixResult.success, fixResult });

    } else if (action === 'reject') {
      await db.update(incidents).set({ status: 'rejected' }).where(eq(incidents.id, id));
      return res.json({ success: true, status: 'rejected' });

    } else if (action === 'snooze') {
      await db.update(incidents).set({ status: 'snoozed' }).where(eq(incidents.id, id));
      return res.json({ success: true, status: 'snoozed' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    logger.error({ error: err.message }, '[IncidentAction] Action failed');
    return res.status(500).json({ error: err.message });
  }
});
