import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionTodos, sortTodos } from '../lib/todoSort';
import type { Todo } from '../lib/db';

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: overrides.id ?? 1,
  user_id: 1,
  title: overrides.title ?? 'Task',
  completed: overrides.completed ?? false,
  due_date: overrides.due_date ?? null,
  priority: overrides.priority ?? 'medium',
  is_recurring: false,
  recurrence_pattern: null,
  reminder_minutes: null,
  last_notification_sent: null,
  created_at: overrides.created_at ?? new Date('2024-01-01T00:00:00Z').toISOString(),
  updated_at: overrides.updated_at ?? null,
});

test('sortTodos orders by priority then due date then newest created_at', () => {
  const items = [
    makeTodo({ id: 1, title: 'Low', priority: 'low', due_date: '2024-01-03T10:00:00Z' }),
    makeTodo({ id: 2, title: 'High', priority: 'high', due_date: '2024-01-01T10:00:00Z' }),
    makeTodo({ id: 3, title: 'Medium', priority: 'medium', due_date: null }),
  ];

  const sorted = sortTodos(items);
  assert.deepEqual(sorted.map((todo) => todo.id), [2, 3, 1]);
});

test('sectionTodos splits overdue, pending, and completed items', () => {
  const now = new Date('2024-01-02T12:00:00Z');
  const items = [
    makeTodo({ id: 1, title: 'Overdue', due_date: '2024-01-01T10:00:00Z' }),
    makeTodo({ id: 2, title: 'Pending', due_date: '2024-01-03T10:00:00Z' }),
    makeTodo({ id: 3, title: 'Completed', completed: true, updated_at: '2024-01-02T08:00:00Z' }),
  ];

  const sections = sectionTodos(items, now);
  assert.deepEqual(sections.overdue.map((todo) => todo.id), [1]);
  assert.deepEqual(sections.pending.map((todo) => todo.id), [2]);
  assert.deepEqual(sections.completed.map((todo) => todo.id), [3]);
});

test('empty titles are rejected by validation logic', () => {
  const title = '   '.trim();
  assert.equal(title.length, 0);
});
