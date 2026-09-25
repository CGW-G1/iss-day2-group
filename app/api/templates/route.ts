import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, type Priority, type RecurrencePattern } from '@/lib/db';
import { validatePriority, validateRecurrencePattern, validateReminderMinutes } from '@/lib/validation';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json(templateDB.findAllByUser(session.userId));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.name !== 'string' || !body.name.trim() || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'Template name and title are required' }, { status: 400 });
  }
  const isRecurring = body.is_recurring === true;
  if (isRecurring && typeof body.due_offset_minutes !== 'number') {
    return NextResponse.json({ error: 'Recurring templates require a due-date offset' }, { status: 400 });
  }
  const subtasks = Array.isArray(body.subtasks) ? body.subtasks : [];
  if (subtasks.some((item) => !item || typeof item.title !== 'string' || !item.title.trim())) {
    return NextResponse.json({ error: 'Invalid template subtasks' }, { status: 400 });
  }
  let priority: Priority;
  let recurrencePattern: RecurrencePattern | null = null;
  let reminderMinutes: number | null = null;
  try {
    priority = validatePriority(body.priority);
    if (body.recurrence_pattern !== undefined && body.recurrence_pattern !== null) recurrencePattern = validateRecurrencePattern(body.recurrence_pattern);
    reminderMinutes = validateReminderMinutes(body.reminder_minutes);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
  if (isRecurring && !recurrencePattern) return NextResponse.json({ error: 'Invalid recurrence pattern' }, { status: 400 });

  return NextResponse.json(templateDB.create(session.userId, {
    name: body.name,
    title: body.title,
    priority,
    is_recurring: isRecurring,
    recurrence_pattern: recurrencePattern,
    reminder_minutes: reminderMinutes,
    due_offset_minutes: typeof body.due_offset_minutes === 'number' ? body.due_offset_minutes : null,
    subtasks_json: JSON.stringify(subtasks.map((item) => ({ title: item.title }))),
  }), { status: 201 });
}