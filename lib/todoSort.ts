import type { Priority, Todo } from '@/lib/db';

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function compareTodos(a: Todo, b: Todo): number {
  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  if (a.due_date && b.due_date) {
    const dueDateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (dueDateDiff !== 0) return dueDateDiff;
  } else if (a.due_date && !b.due_date) {
    return -1;
  } else if (!a.due_date && b.due_date) {
    return 1;
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort(compareTodos);
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
