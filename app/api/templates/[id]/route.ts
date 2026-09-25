import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, type Priority, type RecurrencePattern } from '@/lib/db';
import { validatePriority, validateRecurrencePattern, validateReminderMinutes } from '@/lib/validation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const template = templateDB.findById(Number(id), session.userId);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.name !== 'string' || !body.name.trim() || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'Template name and title are required' }, { status: 400 });
  }
  try {
    const priority: Priority = validatePriority(body.priority);
    const recurrencePattern: RecurrencePattern | null = body.recurrence_pattern == null ? null : validateRecurrencePattern(body.recurrence_pattern);
    const reminderMinutes = validateReminderMinutes(body.reminder_minutes);
    const subtasks = Array.isArray(body.subtasks) ? body.subtasks : [];
    if (subtasks.some((item) => !item || typeof item.title !== 'string' || !item.title.trim())) throw new Error('Invalid template subtasks');
    const values = {
      name: body.name.trim(), title: body.title.trim(), priority, is_recurring: body.is_recurring === true,
      recurrence_pattern: recurrencePattern, reminder_minutes: reminderMinutes,
      due_offset_minutes: typeof body.due_offset_minutes === 'number' ? body.due_offset_minutes : null,
      subtasks_json: JSON.stringify(subtasks.map((item) => ({ title: item.title }))),
    };
    if (values.is_recurring && values.due_offset_minutes === null) {
      return NextResponse.json({ error: 'Recurring templates require a due-date offset' }, { status: 400 });
    }
    if (values.is_recurring && !values.recurrence_pattern) {
      return NextResponse.json({ error: 'Recurring templates require a recurrence pattern' }, { status: 400 });
    }
    return NextResponse.json(templateDB.update(Number(id), session.userId, values));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  if (!templateDB.findById(Number(id), session.userId)) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  templateDB.delete(Number(id), session.userId);
  return NextResponse.json({ success: true });
}