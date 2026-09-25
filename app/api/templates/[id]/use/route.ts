import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, subtaskDB, templateDB, todoDB } from '@/lib/db';
import { fromSingaporeParts, toSingaporeParts } from '@/lib/timezone';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const template = templateDB.findById(Number(id), session.userId);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  let subtasks: Array<{ title: string }>;
  try {
    const parsed: unknown = JSON.parse(template.subtasks_json);
    subtasks = Array.isArray(parsed) ? parsed.filter((item): item is { title: string } => Boolean(item) && typeof item.title === 'string') : [];
  } catch {
    subtasks = [];
  }

  const now = toSingaporeParts(new Date());
  const dueValue = new Date(Date.UTC(now.year, now.month - 1, now.day, now.hour, now.minute, now.second) + (template.due_offset_minutes ?? 0) * 60_000);
  const dueDate = template.due_offset_minutes === null ? null : fromSingaporeParts({
    year: dueValue.getUTCFullYear(),
    month: dueValue.getUTCMonth() + 1,
    day: dueValue.getUTCDate(),
    hour: dueValue.getUTCHours(),
    minute: dueValue.getUTCMinutes(),
    second: dueValue.getUTCSeconds(),
  });

  const result = db.transaction(() => {
    const todo = todoDB.create({
      user_id: session.userId,
      title: template.title,
      due_date: dueDate,
      priority: template.priority,
      is_recurring: template.is_recurring,
      recurrence_pattern: template.recurrence_pattern,
      reminder_minutes: template.reminder_minutes,
    });
    for (const subtask of subtasks) subtaskDB.create(todo.id, { title: subtask.title });
    return todo;
  })();

  return NextResponse.json(result, { status: 201 });
}
