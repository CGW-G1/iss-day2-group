import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, type Priority, type RecurrencePattern } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json(todoDB.findAllByUser(session.userId));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (body.due_date !== undefined && body.due_date !== null && typeof body.due_date !== 'string') {
    return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
  }

  const dueDate = body.due_date === null || typeof body.due_date === 'string' ? body.due_date : null;
  if (dueDate) {
    const due = new Date(dueDate);
    const minDue = new Date(getSingaporeNow().getTime() + 60_000);
    if (Number.isNaN(due.getTime()) || due < minDue) {
      return NextResponse.json(
        { error: 'Due date must be at least 1 minute in the future' },
        { status: 400 }
      );
    }
  }

  const todo = todoDB.create({
    user_id: session.userId,
    title,
    due_date: dueDate,
    priority: typeof body.priority === 'string' ? body.priority as Priority : 'medium',
    is_recurring: typeof body.is_recurring === 'boolean' ? body.is_recurring : false,
    recurrence_pattern: typeof body.recurrence_pattern === 'string' ? body.recurrence_pattern as RecurrencePattern : null,
    reminder_minutes: typeof body.reminder_minutes === 'number' ? body.reminder_minutes : null,
  });

  return NextResponse.json(todo, { status: 201 });
}
