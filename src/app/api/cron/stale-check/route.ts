// src/app/api/cron/stale-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { incidents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'cron-super-secret-key-12345';

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  const awaitingReview = await db.select().from(incidents).where(eq(incidents.status, 'awaiting_approval'));

  return NextResponse.json({
    success: true,
    job: 'stale-check',
    staleCount: awaitingReview.length,
    incidents: awaitingReview.map(i => ({ id: i.id, title: i.title })),
    timestamp: new Date().toISOString()
  });
}
