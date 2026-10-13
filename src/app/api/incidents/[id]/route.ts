// src/app/api/incidents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { incidents, investigations, fixAttempts, pullRequests, postmortems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const incident = await db.select().from(incidents).where(eq(incidents.id, id)).get();
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const investigation = await db.select().from(investigations).where(eq(investigations.incidentId, id)).get();
    const fixAttempt = await db.select().from(fixAttempts).where(eq(fixAttempts.incidentId, id)).get();
    const pr = await db.select().from(pullRequests).where(eq(pullRequests.incidentId, id)).get();
    const postmortem = await db.select().from(postmortems).where(eq(postmortems.incidentId, id)).get();

    return NextResponse.json({
      incident,
      investigation,
      fixAttempt,
      pullRequest: pr,
      postmortem
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
