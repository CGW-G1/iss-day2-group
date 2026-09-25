import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todosToCsv, type ExportEnvelope } from '@/lib/export';
import { todoDB, tagDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAllByUser(session.userId);
  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  if (format === 'csv') {
    return new NextResponse(todosToCsv(todos), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="todos.csv"',
      },
    });
  }
  if (format !== 'json') return NextResponse.json({ error: 'Format must be json or csv' }, { status: 400 });

  const payload: ExportEnvelope = {
    version: 1,
    exported_at: new Date().toISOString(),
    todos,
    tags: tagDB.findAllByUser(session.userId),
  };
  return NextResponse.json(payload);
}
