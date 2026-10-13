// src/app/api/cron/maintenance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { incidents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRecurrence } from '@/core/verificationLoop';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'cron-super-secret-key-12345';

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  const mergedIncidents = await db.select().from(incidents).where(eq(incidents.status, 'merged'));
  for (const inc of mergedIncidents) {
    await checkRecurrence(inc.id, false);
  }

  return NextResponse.json({
    success: true,
    job: 'maintenance',
    processedMergedCount: mergedIncidents.length,
    timestamp: new Date().toISOString()
  });
}
