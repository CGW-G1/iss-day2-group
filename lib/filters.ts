import type { Priority, Todo } from '@/lib/db';

export interface FilterState {
  search: string;
  priority: Priority | 'all';
  tagId: number | 'all';
  completion: 'all' | 'incomplete' | 'completed';
  dueDateFrom: string | null;
  dueDateTo: string | null;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

const PRESETS_KEY = 'todo-app:filter-presets';

export function loadPresets(): FilterPreset[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed as FilterPreset[] : [];
  } catch {
    return [];
  }
}

export function persistPresets(presets: FilterPreset[]): FilterPreset[] {
  if (typeof localStorage !== 'undefined') localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  priority: 'all',
  tagId: 'all',
  completion: 'all',
  dueDateFrom: null,
  dueDateTo: null,
};

export function hasActiveFilters(filters: FilterState): boolean {
  return filters.search.trim() !== '' || filters.priority !== 'all' || filters.tagId !== 'all' ||
    filters.completion !== 'all' || filters.dueDateFrom !== null || filters.dueDateTo !== null;
}

export function applyFilters(todos: Todo[], filters: FilterState): Todo[] {
  let result = [...todos];
  const query = filters.search.trim().toLowerCase();
  if (query) {
    result = result.filter((todo) => todo.title.toLowerCase().includes(query) ||
      (todo.subtasks ?? []).some((subtask) => subtask.title.toLowerCase().includes(query)));
  }
  if (filters.priority !== 'all') result = result.filter((todo) => todo.priority === filters.priority);
  if (filters.tagId !== 'all') result = result.filter((todo) => (todo.tags ?? []).some((tag) => tag.id === filters.tagId));
  if (filters.completion === 'incomplete') result = result.filter((todo) => !todo.completed);
  if (filters.completion === 'completed') result = result.filter((todo) => todo.completed);
  if (filters.dueDateFrom || filters.dueDateTo) {
    result = result.filter((todo) => {
      if (!todo.due_date) return false;
      const date = todo.due_date.slice(0, 10);
      return (!filters.dueDateFrom || date >= filters.dueDateFrom) && (!filters.dueDateTo || date <= filters.dueDateTo);
    });
  }
  return result;
}
