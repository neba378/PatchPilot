// backend/src/controllers/incidentController.ts
import { Request, Response } from 'express';
import { db, incidents, investigations, fixAttempts, pullRequests, postmortems } from '../models';
import { desc, eq } from 'drizzle-orm';
import { executeSandboxFix } from '@/core/sandboxFixPipeline';
import { buildInvestigationContext } from '@/core/contextBuilder';
import { runInvestigation } from '@/agents/investigator';
import { logger } from '@/core/logger';

export class IncidentController {
  // GET /api/incidents - List all incidents
  async list(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = req.query.projectId as string | undefined;
      logger.debug({ projectId }, '[Incidents:List] Fetching incidents list');

      const query = db.select().from(incidents);
      const list = projectId
        ? await query.where(eq(incidents.projectId, projectId)).orderBy(desc(incidents.detectedAt))
        : await query.orderBy(desc(incidents.detectedAt));

      logger.debug({ count: list.length, projectId: projectId || 'all' }, '[Incidents:List] Incidents fetched');
      return res.json({ incidents: list });
    } catch (err: any) {
      logger.error({ error: err.message, stack: err.stack }, '[Incidents] List failed');
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/incidents - Create / Report an incident manually
  async create(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();
    try {
      const body = req.body || {};
      logger.info({ title: body.title, errorType: body.errorType, projectId: body.projectId }, '[Incidents:Create] 📝 Ingesting manual incident submission');
      logger.debug({ payload: body }, '[Incidents:Create] Raw incident payload details');

      const projectId = body.projectId || 'proj_checkout_payment_service_mv7adyis';
      const errorType = body.errorType || body.type || 'TypeError';
      const errorMessage = body.errorMessage || body.message || body.title || 'Unknown error occurred';
      const title = body.title || `${errorType}: ${errorMessage}`;
      const severity = body.severity || 'high';
      const repo = body.repo || 'neba378/test';
      const commitSha = body.commitSha || 'a7b31e9';
      const environment = body.environment || 'production';
      const stackFrames = body.stackFrames || (body.file ? [{
        filename: body.file,
        lineno: body.line || 1,
        function: body.function || 'unknown',
        in_app: true
      }] : []);
      const logExcerpt = body.logExcerpt || `${errorType}: ${errorMessage}\n  at ${body.file || 'src/paymentController.ts'}:${body.line || 17}`;

      const { correlateAndIngestSignal } = await import('@/core/correlation');
      const { triggerBackgroundInvestigation } = await import('@/core/investigationRunner');
      const { generateFingerprint } = await import('@/core/fingerprint');

      const signalInput = {
        projectId,
        source: body.source || 'manual_form',
        externalId: body.externalId || `ext_${Date.now().toString(36)}`,
        fingerprint: generateFingerprint(errorType, errorMessage, stackFrames),
        title,
        severity: severity as any,
        category: 'backend' as const,
        environment,
        errorType,
        errorMessage,
        stackFrames,
        logExcerpt,
        release: body.release || 'service@1.0.0',
        commitSha,
        repo,
        occurredAt: body.occurredAt || new Date().toISOString(),
        rawPayload: JSON.stringify(body)
      };

      logger.debug({ signalInput }, '[Incidents:Create] Normalized signal ready for correlation');
      const { incident, isNew } = await correlateAndIngestSignal(signalInput);
      logger.info({ incidentId: incident.id, isNew, status: incident.status }, '[Incidents:Create] Incident created/correlated');

      triggerBackgroundInvestigation(incident, isNew);
      logger.debug({ incidentId: incident.id }, '[Incidents:Create] Triggered background investigation');

      const durationMs = Date.now() - startTime;
      return res.status(201).json({
        success: true,
        isNew,
        incident,
        durationMs
      });
    } catch (err: any) {
      logger.error({ error: err.message, stack: err.stack }, '[Incidents:Create] Create incident failed');
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/incidents/:id - Get incident detail with associated records
  async getDetail(req: Request, res: Response): Promise<Response> {
    try {
      const id = String(req.params.id);
      logger.debug({ incidentId: id }, '[Incidents:Get] Fetching incident details');

      const incident = await db.select().from(incidents).where(eq(incidents.id, id)).get();
      if (!incident) {
        logger.warn({ incidentId: id }, '[Incidents:Get] Incident not found');
        return res.status(404).json({ error: 'Incident not found' });
      }

      const investigation = await db.select().from(investigations).where(eq(investigations.incidentId, id)).get();
      const fixAttempt = await db.select().from(fixAttempts).where(eq(fixAttempts.incidentId, id)).get();
      const pr = await db.select().from(pullRequests).where(eq(pullRequests.incidentId, id)).get();
      const postmortem = await db.select().from(postmortems).where(eq(postmortems.incidentId, id)).get();

      logger.debug({
        incidentId: id,
        status: incident.status,
        hasInvestigation: Boolean(investigation),
        hasFixAttempt: Boolean(fixAttempt),
        hasPR: Boolean(pr),
        hasPostmortem: Boolean(postmortem)
      }, '[Incidents:Get] Incident details assembled');

      return res.json({
        incident,
        investigation,
        fixAttempt,
        pullRequest: pr,
        postmortem
      });
    } catch (err: any) {
      logger.error({ error: err.message, stack: err.stack }, '[Incidents:Get] Get detail failed');
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/incidents/:id/action - Human approval action
  async handleAction(req: Request, res: Response): Promise<Response> {
    const actionStartTime = Date.now();
    try {
      const id = String(req.params.id);
      const { action } = req.body || {};
      logger.info({ incidentId: id, action }, `[IncidentAction] 🔘 User triggered human action "${action}" on incident ${id}`);

      const incident = await db.select().from(incidents).where(eq(incidents.id, id)).get();
      if (!incident) {
        logger.warn({ incidentId: id }, '[IncidentAction] Target incident not found');
        return res.status(404).json({ error: 'Incident not found' });
      }

      if (action === 'accept') {
        logger.info({ incidentId: id, currentStatus: incident.status }, '[IncidentAction] ✅ Human approved fix request. Initiating sandbox fix pipeline');

        let investigation = await db.select().from(investigations).where(eq(investigations.incidentId, id)).get();
        if (!investigation) {
          logger.info({ incidentId: id }, '[IncidentAction] No pre-existing investigation found. Running on-demand investigation');
          const ctx = await buildInvestigationContext(incident as any);
          logger.debug({ incidentId: id, suspectFile: ctx.fileExcerpts[0]?.path }, '[IncidentAction] Built investigation context');
          const invResult = await runInvestigation(ctx);
          logger.info({
            incidentId: id,
            confidence: invResult.confidenceScore,
            affectedFiles: invResult.affectedFiles,
            rootCauses: invResult.rootCauses
          }, '[IncidentAction] Investigation completed successfully');

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

        logger.info({ incidentId: id, fixAttemptTarget: parsedInv.affectedFiles }, '[IncidentAction] Handing off to executeSandboxFix');
        const fixResult = await executeSandboxFix(incident as any, parsedInv as any, true);
        const actionDuration = Date.now() - actionStartTime;
        logger.info({
          incidentId: id,
          success: fixResult.success,
          prNumber: fixResult.prNumber,
          prUrl: fixResult.prUrl,
          durationMs: actionDuration
        }, '[IncidentAction] 🏁 Sandbox fix pipeline execution finished');
        return res.json({ success: fixResult.success, fixResult });

      } else if (action === 'reject') {
        logger.info({ incidentId: id }, '[IncidentAction] ❌ Human rejected fix. Updating incident status to rejected');
        await db.update(incidents).set({ status: 'rejected' }).where(eq(incidents.id, id));
        return res.json({ success: true, status: 'rejected' });

      } else if (action === 'snooze') {
        logger.info({ incidentId: id }, '[IncidentAction] ⏳ Human snoozed incident. Updating incident status to snoozed');
        await db.update(incidents).set({ status: 'snoozed' }).where(eq(incidents.id, id));
        return res.json({ success: true, status: 'snoozed' });
      }

      logger.warn({ incidentId: id, action }, '[IncidentAction] Invalid action specified');
      return res.status(400).json({ error: 'Invalid action' });
    } catch (err: any) {
      logger.error({ error: err.message, stack: err.stack }, '[IncidentAction] Action failed');
      return res.status(500).json({ error: err.message });
    }
  }
}

export const incidentController = new IncidentController();
