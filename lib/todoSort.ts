import type { Priority, Todo } from '@/lib/db';

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }

    const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function sectionTodos(todos: Todo[], now: Date): { overdue: Todo[]; pending: Todo[]; completed: Todo[] } {
  const incomplete = todos.filter((todo) => !todo.completed);
  const overdue = sortTodos(
    incomplete.filter((todo) => todo.due_date && new Date(todo.due_date).getTime() < now.getTime())
  );
  const pending = sortTodos(
    incomplete.filter((todo) => !todo.due_date || new Date(todo.due_date).getTime() >= now.getTime())
  );
  const completed = [...todos]
    .filter((todo) => todo.completed)
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
    );

  return { overdue, pending, completed };
}
