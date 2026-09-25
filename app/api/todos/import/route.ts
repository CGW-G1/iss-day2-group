import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, subtaskDB, tagDB, todoDB, type Todo } from '@/lib/db';
import { validatePriority, validateRecurrencePattern, validateReminderMinutes } from '@/lib/validation';

type ImportPayload = { version: 1; todos: Todo[]; tags?: Array<{ name: string; color?: string }> };

function isPayload(value: unknown): value is ImportPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ImportPayload>;
  return payload.version === 1 && Array.isArray(payload.todos) && (payload.tags === undefined || Array.isArray(payload.tags));
}

function isValidDueDate(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!isPayload(body)) return NextResponse.json({ error: 'Invalid import payload' }, { status: 400 });

  try {
    const result = db.transaction(() => {
      const existingTags = tagDB.findAllByUser(session.userId);
      const tagIds = new Map<string, number>();
      for (const tag of body.tags ?? []) {
        if (typeof tag.name !== 'string' || !tag.name.trim()) throw new Error('Invalid tag');
        const key = tag.name.trim().toLowerCase();
        const existing = existingTags.find((item) => item.name.toLowerCase() === key);
        const created = existing ?? tagDB.create(session.userId, { name: tag.name.trim(), color: tag.color });
        tagIds.set(key, created.id);
      }

      let imported = 0;
      for (const source of body.todos) {
        if (typeof source.title !== 'string' || !source.title.trim()) throw new Error('Invalid todo');
        if (!isValidDueDate(source.due_date)) throw new Error('Invalid due date');
        const priority = validatePriority(source.priority);
        const recurrencePattern = source.recurrence_pattern == null ? null : validateRecurrencePattern(source.recurrence_pattern);
        const reminderMinutes = validateReminderMinutes(source.reminder_minutes);
        if (source.is_recurring && (!source.due_date || !recurrencePattern)) throw new Error('Invalid recurring todo');
        const todo = todoDB.create({
          user_id: session.userId,
          title: source.title,
          due_date: source.due_date ?? null,
          priority,
          is_recurring: source.is_recurring === true,
          recurrence_pattern: recurrencePattern,
          reminder_minutes: reminderMinutes,
        });
        if (source.completed) todoDB.update(todo.id, { completed: true });
        for (const subtask of source.subtasks ?? []) {
          if (typeof subtask.title !== 'string' || !subtask.title.trim()) throw new Error('Invalid subtask');
          const created = subtaskDB.create(todo.id, { title: subtask.title });
          if (subtask.completed) subtaskDB.update(created.id, { completed: true });
        }
        for (const tag of source.tags ?? []) {
          const tagId = tagIds.get(tag.name.toLowerCase());
          if (tagId) tagDB.attachToTodo(todo.id, tagId, session.userId);
        }
        imported += 1;
      }
      return imported;
    })();

    return NextResponse.json({ success: true, imported: result });
  } catch {
    return NextResponse.json({ error: 'Import failed; no changes were saved' }, { status: 400 });
  }
}
