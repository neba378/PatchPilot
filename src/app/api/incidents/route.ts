import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { incidents } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const query = db.select().from(incidents);
    const list = projectId
      ? await query.where(eq(incidents.projectId, projectId)).orderBy(desc(incidents.detectedAt))
      : await query.orderBy(desc(incidents.detectedAt));

    return NextResponse.json({ incidents: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
