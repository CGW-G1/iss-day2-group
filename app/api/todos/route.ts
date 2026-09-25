import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, type Priority, type RecurrencePattern } from '@/lib/db';
import { singaporeTimestamp } from '@/lib/timezone';
import { validatePriority, validateRecurrencePattern, validateReminderMinutes } from '@/lib/validation';

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

  if (body.is_recurring !== undefined && typeof body.is_recurring !== 'boolean') {
    return NextResponse.json({ error: 'is_recurring must be a boolean' }, { status: 400 });
  }

  if (body.due_date !== undefined && body.due_date !== null && typeof body.due_date !== 'string') {
    return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
  }

  const dueDate = body.due_date === null || typeof body.due_date === 'string' ? body.due_date : null;
  if (dueDate) {
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime()) || singaporeTimestamp(dueDate) < singaporeTimestamp(new Date()) + 60_000) {
      return NextResponse.json(
        { error: 'Due date must be at least 1 minute in the future' },
        { status: 400 }
      );
    }
  }

  let priority: Priority = 'medium';
  try {
    if (body.priority === null) {
      throw new Error("Invalid priority: null. Must be 'high', 'medium', or 'low'.");
    }
    priority = validatePriority(body.priority);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  let recurrencePattern: RecurrencePattern | null = null;
  if (body.recurrence_pattern !== undefined) {
    if (body.recurrence_pattern === null && body.is_recurring === true) {
      return NextResponse.json({ error: 'Invalid recurrence pattern: null. Must be \'daily\', \'weekly\', \'monthly\', or \'yearly\'.' }, { status: 400 });
    }

    if (body.recurrence_pattern === null) {
      recurrencePattern = null;
    } else {
      try {
        recurrencePattern = validateRecurrencePattern(body.recurrence_pattern);
      } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
      }
    }
  }

  if (body.is_recurring === true) {
    if (!dueDate) {
      return NextResponse.json({ error: 'Recurring todos require a due date' }, { status: 400 });
    }

    if (!recurrencePattern) {
      return NextResponse.json({ error: "Invalid recurrence pattern: null. Must be 'daily', 'weekly', 'monthly', or 'yearly'." }, { status: 400 });
    }
  }

  if (body.is_recurring !== true) {
    recurrencePattern = null;
  }

  let reminderMinutes: number | null;
  try {
    reminderMinutes = validateReminderMinutes(body.reminder_minutes);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const todo = todoDB.create({
    user_id: session.userId,
    title,
    due_date: dueDate,
    priority,
    is_recurring: typeof body.is_recurring === 'boolean' ? body.is_recurring : false,
    recurrence_pattern: recurrencePattern,
    reminder_minutes: reminderMinutes,
  });

  return NextResponse.json(todo, { status: 201 });
}
