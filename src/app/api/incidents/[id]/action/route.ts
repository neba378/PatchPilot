// src/app/api/incidents/[id]/action/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { incidents, investigations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { executeSandboxFix } from '@/core/sandboxFixPipeline';
import { buildInvestigationContext } from '@/core/contextBuilder';
import { runInvestigation } from '@/agents/investigator';
import { canTransition } from '@/core/stateMachine';
import { logger } from '@/core/logger';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action; // 'accept' | 'reject' | 'snooze'

    const incident = await db.select().from(incidents).where(eq(incidents.id, id)).get();
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
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
        investigation = { ...invResult, hypotheses: JSON.stringify(invResult.hypotheses), rootCauses: JSON.stringify(invResult.rootCauses), affectedFiles: JSON.stringify(invResult.affectedFiles) } as any;
      }

      // Execute sandbox reproduction, fix, mutation test, and open PR
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
      return NextResponse.json({ success: fixResult.success, fixResult });

    } else if (action === 'reject') {
      await db.update(incidents).set({ status: 'rejected' }).where(eq(incidents.id, id));
      return NextResponse.json({ success: true, status: 'rejected' });

    } else if (action === 'snooze') {
      await db.update(incidents).set({ status: 'snoozed' }).where(eq(incidents.id, id));
      return NextResponse.json({ success: true, status: 'snoozed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    logger.error({ error: err.message }, '[IncidentAction] Action failed');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
