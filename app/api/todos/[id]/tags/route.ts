import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, todoDB } from '@/lib/db';

async function parseTagId(request: NextRequest): Promise<number | null> {
  try {
    const body = await request.json() as Record<string, unknown>;
    return typeof body.tag_id === 'number' && Number.isInteger(body.tag_id) ? body.tag_id : null;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const todoId = Number(id);
  if (!todoDB.findByUserAndId(session.userId, todoId)) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  const tagId = await parseTagId(request);
  if (tagId === null || !tagDB.findById(tagId, session.userId)) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  tagDB.attachToTodo(todoId, tagId, session.userId);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const todoId = Number(id);
  if (!todoDB.findByUserAndId(session.userId, todoId)) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  const tagId = await parseTagId(request);
  if (tagId === null) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  tagDB.detachFromTodo(todoId, tagId, session.userId);
  return NextResponse.json({ success: true });
}
