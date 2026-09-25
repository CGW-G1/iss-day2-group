import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
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

  const body = await request.json();
  const title = (body.title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (body.due_date) {
    const due = new Date(body.due_date);
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
    due_date: body.due_date ?? null,
    priority: body.priority ?? 'medium',
    is_recurring: body.is_recurring ?? false,
    recurrence_pattern: body.recurrence_pattern ?? null,
    reminder_minutes: body.reminder_minutes ?? null,
  });

  return NextResponse.json(todo, { status: 201 });
}
