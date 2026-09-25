import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const month = new URL(request.url).searchParams.get('month') ?? '';
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  return NextResponse.json(holidayDB.findByMonth(month));
}