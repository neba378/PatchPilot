// src/app/api/incidents/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { incidents } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const list = await db.select().from(incidents).orderBy(desc(incidents.detectedAt));
    return NextResponse.json({ incidents: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
