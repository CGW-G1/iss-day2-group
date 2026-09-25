import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todo = todoDB.findByUserAndId(session.userId, Number(id));
  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json(todo);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const existing = todoDB.findByUserAndId(session.userId, Number(id));
  if (!existing) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json();
  if (body.title !== undefined && !String(body.title).trim()) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
  }

  if (body.due_date !== undefined && body.due_date) {
    const due = new Date(body.due_date);
    if (Number.isNaN(due.getTime())) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }

    const minDue = new Date(Date.now() + 60_000);
    if (due < minDue) {
      return NextResponse.json({ error: 'Due date must be at least 1 minute in the future' }, { status: 400 });
    }
  }

  const updated = todoDB.update(Number(id), {
    ...body,
    title: body.title !== undefined ? String(body.title).trim() : undefined,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const existing = todoDB.findByUserAndId(session.userId, Number(id));
  if (!existing) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  todoDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
