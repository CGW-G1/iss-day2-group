import type { Todo } from '@/lib/db';
import { toSingaporeParts } from '@/lib/timezone';

export interface CalendarCell {
  date: string;
  day: number;
  currentMonth: boolean;
  todos: Todo[];
}

export function generateCalendarGrid(year: number, month: number, todos: Todo[]): CalendarCell[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - firstDay + 1;
    const value = new Date(Date.UTC(year, month - 1, dayOffset));
    const date = value.toISOString().slice(0, 10);
    cells.push({
      date,
      day: value.getUTCDate(),
      currentMonth: dayOffset >= 1 && dayOffset <= daysInMonth,
      todos: todos.filter((todo) => {
        if (!todo.due_date) return false;
        const parts = toSingaporeParts(todo.due_date);
        return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}` === date;
      }),
    });
  }

  return cells;
}
