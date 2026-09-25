import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

async function getOwnedSubtask(userId: number, id: number) {
  const subtask = subtaskDB.findById(id);
  if (!subtask || !todoDB.findByUserAndId(userId, subtask.todo_id)) return null;
  return subtask;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const subtask = await getOwnedSubtask(session.userId, Number(id));
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    return NextResponse.json({ error: 'Subtask title cannot be empty' }, { status: 400 });
  }
  if (body.completed !== undefined && typeof body.completed !== 'boolean') {
    return NextResponse.json({ error: 'Completed must be a boolean' }, { status: 400 });
  }

  return NextResponse.json(subtaskDB.update(subtask.id, {
    title: body.title !== undefined ? String(body.title).trim() : undefined,
    completed: body.completed as boolean | undefined,
  }));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const subtask = await getOwnedSubtask(session.userId, Number(id));
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });

  subtaskDB.delete(subtask.id);
  return NextResponse.json({ success: true });
}