import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, todoDB, type Priority, RECURRENCE_PATTERNS, type RecurrencePattern } from '@/lib/db';
import { calculateNextDueDate } from '@/lib/recurrence';
import { validatePriority, validateRecurrencePattern, validateReminderMinutes } from '@/lib/validation';
import { singaporeTimestamp } from '@/lib/timezone';

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.title !== undefined && typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Title must be a string' }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
  }

  if (body.completed !== undefined && typeof body.completed !== 'boolean') {
    return NextResponse.json({ error: 'Completed must be a boolean' }, { status: 400 });
  }

  if (body.is_recurring !== undefined && typeof body.is_recurring !== 'boolean') {
    return NextResponse.json({ error: 'is_recurring must be a boolean' }, { status: 400 });
  }

  if (body.due_date !== undefined && body.due_date !== null && typeof body.due_date !== 'string') {
    return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
  }

  if (body.due_date !== undefined && body.due_date) {
    const due = new Date(body.due_date as string);
    if (Number.isNaN(due.getTime())) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }

    if (singaporeTimestamp(body.due_date as string) < singaporeTimestamp(new Date()) + 60_000) {
      return NextResponse.json({ error: 'Due date must be at least 1 minute in the future' }, { status: 400 });
    }
  }

  let priority: Priority | undefined;
  if (body.priority !== undefined) {
    if (body.priority === null) {
      return NextResponse.json({ error: "Invalid priority: null. Must be 'high', 'medium', or 'low'." }, { status: 400 });
    }

    try {
      priority = validatePriority(body.priority);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
  }

  const nextRecurringState = body.is_recurring !== undefined ? body.is_recurring : existing.is_recurring;
  const nextDueDate = body.due_date !== undefined ? (body.due_date === null ? null : String(body.due_date)) : existing.due_date;

  let recurrencePattern: RecurrencePattern | null | undefined;
  if (body.recurrence_pattern !== undefined) {
    if (body.recurrence_pattern === null) {
      recurrencePattern = null;
    } else {
      try {
        recurrencePattern = validateRecurrencePattern(body.recurrence_pattern);
      } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
      }
    }
  } else {
    recurrencePattern = existing.recurrence_pattern;
  }

  if (!nextRecurringState) {
    recurrencePattern = null;
  }

  if (nextRecurringState && !nextDueDate) {
    return NextResponse.json({ error: 'Recurring todos require a due date' }, { status: 400 });
  }

  if (nextRecurringState && (!recurrencePattern || !RECURRENCE_PATTERNS.includes(recurrencePattern))) {
    return NextResponse.json({ error: 'Invalid recurrence pattern' }, { status: 400 });
  }

  let reminderMinutes: number | null | undefined;
  try {
    reminderMinutes = body.reminder_minutes !== undefined
      ? validateReminderMinutes(body.reminder_minutes)
      : undefined;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  if (body.last_notification_sent !== undefined) {
    if (typeof body.last_notification_sent !== 'string' || Number.isNaN(Date.parse(body.last_notification_sent))) {
      return NextResponse.json({ error: 'Invalid notification timestamp' }, { status: 400 });
    }
  }

  const updateInput = {
    ...body,
    priority,
    title: body.title !== undefined ? body.title.trim() : undefined,
    is_recurring: body.is_recurring !== undefined ? body.is_recurring : undefined,
    recurrence_pattern: recurrencePattern,
    due_date: body.due_date !== undefined ? (body.due_date === null ? null : String(body.due_date)) : undefined,
    reminder_minutes: reminderMinutes,
    last_notification_sent: body.due_date !== undefined || body.reminder_minutes !== undefined
      ? null
      : body.last_notification_sent as string | undefined,
  };

  const justCompleted = body.completed === true && existing.completed === false;
  const nextTitle = updateInput.title ?? existing.title;
  const nextPriority = updateInput.priority ?? existing.priority;
  const nextReminder = updateInput.reminder_minutes !== undefined
    ? updateInput.reminder_minutes
    : existing.reminder_minutes;
  if (justCompleted && nextRecurringState && recurrencePattern && nextDueDate) {
    const result = todoDB.completeRecurring(Number(id), {
      ...updateInput,
    }, {
      user_id: session.userId,
      title: nextTitle,
      due_date: calculateNextDueDate(nextDueDate, recurrencePattern),
      priority: nextPriority,
      is_recurring: true,
      recurrence_pattern: recurrencePattern,
      reminder_minutes: nextReminder ?? null,
    }, tagDB.getTagIdsForTodo(existing.id));

    return NextResponse.json(result);
  }

  const updated = todoDB.update(Number(id), updateInput);

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
