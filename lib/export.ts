import type { Tag, Todo } from '@/lib/db';

export interface ExportEnvelope {
  version: 1;
  exported_at: string;
  todos: Todo[];
  tags: Tag[];
}

export function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function todosToCsv(todos: Todo[]): string {
  const headers = ['title', 'completed', 'due_date', 'priority', 'is_recurring', 'recurrence_pattern', 'reminder_minutes', 'tags', 'subtasks'];
  const rows = todos.map((todo) => [
    todo.title,
    todo.completed,
    todo.due_date,
    todo.priority,
    todo.is_recurring,
    todo.recurrence_pattern,
    todo.reminder_minutes,
    (todo.tags ?? []).map((tag) => tag.name).join('|'),
    (todo.subtasks ?? []).map((subtask) => `${subtask.completed ? '[x]' : '[ ]'} ${subtask.title}`).join('|'),
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}
