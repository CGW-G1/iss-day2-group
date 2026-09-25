'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Priority, RecurrencePattern, Subtask, Tag, Template, Todo } from '@/lib/db';
import { REMINDER_LABELS, type ReminderMinutes } from '@/lib/reminders';
import { calculateProgress } from '@/lib/progress';
import { sectionTodos, sortTodos } from '@/lib/todoSort';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { applyFilters, DEFAULT_FILTER_STATE, hasActiveFilters, loadPresets, persistPresets, type FilterPreset, type FilterState } from '@/lib/filters';

const PRIORITY_STYLES: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700' },
  low: { label: 'Low', className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700' },
};

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[priority].className}`}>
      {PRIORITY_STYLES[priority].label}
    </span>
  );
}

function RecurrenceBadge({ pattern }: { pattern: RecurrencePattern }) {
  return (
    <span className="inline-flex items-center rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-800 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
      Repeat: {pattern}
    </span>
  );
}

function SubtaskList({ todoId, subtasks, onChange }: {
  todoId: number;
  subtasks: Subtask[];
  onChange: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const progress = calculateProgress(subtasks);

  async function addSubtask() {
    const title = newTitle.trim();
    if (!title) return;
    const response = await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) return;
    setNewTitle('');
    await onChange();
  }

  async function toggleSubtask(subtask: Subtask) {
    const response = await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !subtask.completed }),
    });
    if (response.ok) await onChange();
  }

  async function renameSubtask(subtask: Subtask) {
    const title = window.prompt('Subtask title', subtask.title)?.trim();
    if (!title || title === subtask.title) return;
    const response = await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (response.ok) await onChange();
  }

  async function deleteSubtask(subtaskId: number) {
    const response = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    if (response.ok) await onChange();
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" onClick={() => setExpanded((current) => !current)}>
        {expanded ? 'Hide' : 'Show'} subtasks
      </button>
      {progress.total > 0 && (
        <div style={{ marginTop: 6 }}>
          <small>{progress.completed}/{progress.total} subtasks ({progress.percent}%)</small>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress.percent}%`, height: '100%', background: progress.percent === 100 ? '#22c55e' : '#3b82f6' }} />
          </div>
        </div>
      )}
      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 16 }}>
          {subtasks.map((subtask) => (
            <div key={subtask.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <input type="checkbox" checked={subtask.completed} onChange={() => toggleSubtask(subtask)} />
              <span style={{ textDecoration: subtask.completed ? 'line-through' : 'none' }}>{subtask.title}</span>
              <button type="button" onClick={() => renameSubtask(subtask)}>Rename</button>
              <button type="button" onClick={() => deleteSubtask(subtask.id)} style={{ marginLeft: 'auto' }}>Delete</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void addSubtask(); }}
              placeholder="Add subtask"
            />
            <button type="button" onClick={() => void addSubtask()}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

const initialTodos: Todo[] = [];

function App() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<ReminderMinutes | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [tagFilter, setTagFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'incomplete' | 'completed'>('all');
  const [dueDateFrom, setDueDateFrom] = useState<string | null>(null);
  const [dueDateTo, setDueDateTo] = useState<string | null>(null);
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets());
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [manageTags, setManageTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [manageTemplates, setManageTemplates] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [error, setError] = useState('');
  const notifications = useNotifications();
  const debouncedSearch = useDebounce(search);
  const currentFilters: FilterState = {
    search,
    priority: priorityFilter,
    tagId: tagFilter,
    completion: completionFilter,
    dueDateFrom,
    dueDateTo,
  };

  async function reloadTodos() {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Unable to load todos');
    setTodos((await response.json()) as Todo[]);
  }

  async function reloadTags() {
    const response = await fetch('/api/tags');
    if (!response.ok) throw new Error('Unable to load tags');
    setTags((await response.json()) as Tag[]);
  }

  useEffect(() => {
    fetch('/api/tags')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load tags');
        return (await response.json()) as Tag[];
      })
      .then(setTags)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load tags'));
  }, []);

  useEffect(() => {
    fetch('/api/templates')
      .then(async (response) => (response.ok ? (await response.json()) as Template[] : []))
      .then(setTemplates)
      .catch(() => setError('Unable to load templates'));
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/todos')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load todos');
        return (await response.json()) as Todo[];
      })
      .then((loadedTodos) => {
        if (active) setTodos(loadedTodos);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load todos');
      });

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const now = new Date();
    const filtered = applyFilters(todos, {
      search: debouncedSearch,
      priority: priorityFilter,
      tagId: tagFilter,
      completion: completionFilter,
      dueDateFrom,
      dueDateTo,
    });
    return sectionTodos(sortTodos(filtered), now);
  }, [completionFilter, debouncedSearch, dueDateFrom, dueDateTo, priorityFilter, tagFilter, todos]);

  async function createTag() {
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName, color: newTagColor }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Unable to create tag');
      return;
    }
    setNewTagName('');
    await reloadTags();
  }

  async function editTag(tag: Tag) {
    const name = window.prompt('Tag name', tag.name)?.trim();
    if (!name || name === tag.name) return;
    const response = await fetch(`/api/tags/${tag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      await reloadTags();
      await reloadTodos();
    }
  }

  async function deleteTag(tag: Tag) {
    const response = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
    if (response.ok) {
      if (tagFilter === tag.id) setTagFilter('all');
      await reloadTags();
      await reloadTodos();
    }
  }

  async function saveTemplate() {
    const name = window.prompt('Template name')?.trim();
    if (!name || !title.trim()) return;
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title: title.trim(), priority, is_recurring: isRecurring, recurrence_pattern: isRecurring ? recurrencePattern : null, reminder_minutes: reminderMinutes, subtasks: [] }),
    });
    if (response.ok) {
      const created = (await response.json()) as Template;
      setTemplates((current) => [created, ...current]);
    }
  }

  async function instantiateTemplate(template: Template) {
    const response = await fetch(`/api/templates/${template.id}/use`, { method: 'POST' });
    if (response.ok) await reloadTodos();
  }

  async function deleteTemplate(template: Template) {
    const response = await fetch(`/api/templates/${template.id}`, { method: 'DELETE' });
    if (response.ok) setTemplates((current) => current.filter((item) => item.id !== template.id));
  }

  function clearFilters() {
    setSearch(DEFAULT_FILTER_STATE.search);
    setPriorityFilter(DEFAULT_FILTER_STATE.priority);
    setTagFilter(DEFAULT_FILTER_STATE.tagId);
    setCompletionFilter(DEFAULT_FILTER_STATE.completion);
    setDueDateFrom(DEFAULT_FILTER_STATE.dueDateFrom);
    setDueDateTo(DEFAULT_FILTER_STATE.dueDateTo);
  }

  function saveFilterPreset() {
    const name = window.prompt('Preset name')?.trim();
    if (!name) return;
    const preset: FilterPreset = { id: crypto.randomUUID(), name, filters: currentFilters, createdAt: new Date().toISOString() };
    setPresets((current) => persistPresets([...current, preset]));
  }

  function applyPreset(preset: FilterPreset) {
    setSearch(preset.filters.search);
    setPriorityFilter(preset.filters.priority);
    setTagFilter(preset.filters.tagId);
    setCompletionFilter(preset.filters.completion);
    setDueDateFrom(preset.filters.dueDateFrom);
    setDueDateTo(preset.filters.dueDateTo);
  }

  function deletePreset(id: string) {
    setPresets((current) => persistPresets(current.filter((preset) => preset.id !== id)));
  }
  async function importTodos(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const response = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await file.text(),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? 'Import failed');
      await reloadTodos();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed');
    } finally {
      event.target.value = '';
    }
  }

  async function updateTodo(todo: Todo, patch: Partial<Todo>) {
    const response = await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? 'Unable to update todo');
    }

    const payload = (await response.json()) as Todo | { todo?: Todo; nextInstance?: Todo };
    const updated = 'todo' in payload && payload.todo ? payload.todo : (payload as Todo);
    setTodos((current) => sortTodos(current.map((item) => (item.id === todo.id ? updated : item))));
  }

  async function addTodo(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }

    if (dueDate) {
      const due = new Date(dueDate);
      const minDue = new Date(Date.now() + 60_000);
      if (Number.isNaN(due.getTime()) || due < minDue) {
        setError('Due date must be at least 1 minute in the future');
        return;
      }
    }

    if (isRecurring && !dueDate) {
      setError('Recurring todos require a due date');
      return;
    }

    const optimistic: Todo = {
      id: Date.now(),
      user_id: 1,
      title: trimmed,
      completed: false,
      due_date: dueDate || null,
      priority,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
      reminder_minutes: reminderMinutes,
      last_notification_sent: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };

    setTodos((current) => sortTodos([...current, optimistic]));
    setTitle('');
    setPriority('medium');
    setDueDate('');
    setReminderMinutes(null);
    setIsRecurring(false);
    setRecurrencePattern('weekly');
    setError('');

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          priority,
          due_date: dueDate || null,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          reminder_minutes: reminderMinutes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to create todo');
      }

      const created = (await response.json()) as Todo;
      await Promise.all(selectedTagIds.map((tagId) => fetch(`/api/todos/${created.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      })));
      setSelectedTagIds([]);
      setTodos((current) => sortTodos(current.map((todo) => (todo.id === optimistic.id ? created : todo))));
      await reloadTodos();
    } catch (err) {
      setTodos((current) => current.filter((todo) => todo.id !== optimistic.id));
      setError(err instanceof Error ? err.message : 'Unable to create todo');
    }
  }

  async function toggleTodo(todo: Todo) {
    const nextCompleted = !todo.completed;
    const previousTodos = todos;
    setTodos((current) => sortTodos(current.map((item) => (item.id === todo.id ? { ...item, completed: nextCompleted } : item))));

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      if (!response.ok) {
        throw new Error('Unable to update todo');
      }

      const payload = (await response.json()) as Todo | { todo?: Todo; nextInstance?: Todo };
      const updated = 'todo' in payload && payload.todo ? payload.todo : (payload as Todo);
      setTodos((current) => sortTodos(current.map((item) => (item.id === todo.id ? updated : item))));
      if ('nextInstance' in payload && payload.nextInstance) {
        const nextInstance = payload.nextInstance;
        setTodos((current) => sortTodos([...current, nextInstance]));
      }
    } catch {
      setTodos(previousTodos);
      setError('Unable to update todo');
    }
  }

  async function deleteTodo(todoId: number) {
    const previousTodos = todos;
    setTodos((current) => current.filter((todo) => todo.id !== todoId));

    try {
      const response = await fetch(`/api/todos/${todoId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Unable to delete todo');
      }
    } catch {
      setTodos(previousTodos);
      setError('Unable to delete todo');
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}>
      <h1>Todo App</h1>
      <button type="button" onClick={() => void notifications.requestPermission()} disabled={notifications.permission === 'granted'}>
        {notifications.permission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
      </button>
      <button type="button" onClick={() => setManageTags((current) => !current)}>Manage Tags</button>
      <button type="button" onClick={() => setManageTemplates((current) => !current)}>Manage Templates</button>
        <button type="button" onClick={() => window.open('/api/todos/export?format=json', '_self')}>Export JSON</button>
        <button type="button" onClick={() => window.open('/api/todos/export?format=csv', '_self')}>Export CSV</button>
        <label>Import JSON <input type="file" accept="application/json" onChange={(event) => void importTodos(event)} /></label>
        {manageTemplates && (
          <div style={{ border: '1px solid #ddd', padding: 12, margin: '12px 0' }}>
            <button type="button" onClick={() => void saveTemplate()}>Save current form as template</button>
            {templates.map((template) => (
              <div key={template.id} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <span>{template.name}</span>
                <button type="button" onClick={() => void instantiateTemplate(template)}>Use</button>
                <button type="button" onClick={() => void deleteTemplate(template)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      {manageTags && (
        <div style={{ border: '1px solid #ddd', padding: 12, margin: '12px 0' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newTagName} onChange={(event) => setNewTagName(event.target.value)} placeholder="Tag name" />
            <input type="color" value={newTagColor} onChange={(event) => setNewTagColor(event.target.value)} />
            <button type="button" onClick={() => void createTag()}>Create Tag</button>
          </div>
          {tags.map((tag) => (
            <div key={tag.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <span style={{ color: tag.color }}>{tag.name}</span>
              <button type="button" onClick={() => void editTag(tag)}>Edit</button>
              <button type="button" onClick={() => void deleteTag(tag)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search todos and subtasks" style={{ width: '100%', padding: 10, marginBottom: 8 }} />
      <form onSubmit={addTodo} style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a todo"
          style={{ flex: 1, minWidth: 220, padding: 10 }}
        />

        <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} style={{ padding: 10 }}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} disabled={!dueDate} />
          Repeat
        </label>

        {isRecurring && (
          <select value={recurrencePattern} onChange={(event) => setRecurrencePattern(event.target.value as RecurrencePattern)} style={{ padding: 10 }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <button
              type="button"
              key={tag.id}
              onClick={() => setSelectedTagIds((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])}
              style={{ background: selectedTagIds.includes(tag.id) ? tag.color : '#fff', color: selectedTagIds.includes(tag.id) ? '#fff' : tag.color, border: `1px solid ${tag.color}`, padding: '3px 8px' }}
            >
              {tag.name}
            </button>
          ))}
        </div>

        <select
          value={reminderMinutes ?? ''}
          disabled={!dueDate}
          onChange={(event) => setReminderMinutes(event.target.value ? Number(event.target.value) as ReminderMinutes : null)}
          style={{ padding: 10 }}
        >
          <option value="">No reminder</option>
          {(Object.entries(REMINDER_LABELS) as Array<[string, string]>).map(([minutes, label]) => (
            <option key={minutes} value={minutes}>{label} before</option>
          ))}
        </select>

        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)} style={{ padding: 10 }}>
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))} style={{ padding: 10 }}>
          <option value="all">All tags</option>
          {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>

        <select value={completionFilter} onChange={(event) => setCompletionFilter(event.target.value as 'all' | 'incomplete' | 'completed')} style={{ padding: 10 }}>
          <option value="all">All statuses</option>
          <option value="incomplete">Incomplete</option>
          <option value="completed">Completed</option>
        </select>

        <input type="date" value={dueDateFrom ?? ''} onChange={(event) => setDueDateFrom(event.target.value || null)} style={{ padding: 10 }} />
        <input type="date" value={dueDateTo ?? ''} onChange={(event) => setDueDateTo(event.target.value || null)} style={{ padding: 10 }} />

        {hasActiveFilters(currentFilters) && (
          <>
            <button type="button" onClick={clearFilters}>Clear all filters</button>
            <button type="button" onClick={saveFilterPreset}>Save filter</button>
          </>
        )}

        {presets.map((preset) => (
          <span key={preset.id}>
            <button type="button" onClick={() => applyPreset(preset)}>{preset.name}</button>
            <button type="button" onClick={() => deletePreset(preset.id)}>x</button>
          </span>
        ))}

        <input
          type="datetime-local"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          style={{ padding: 10 }}
        />

        <button type="submit" style={{ padding: '10px 18px' }}>Add</button>
      </form>

      {error && <p style={{ color: 'crimson', marginBottom: 16 }}>{error}</p>}

      {[
        { key: 'overdue', label: 'Overdue', items: visible.overdue },
        { key: 'pending', label: 'Pending', items: visible.pending },
        { key: 'completed', label: 'Completed', items: visible.completed },
      ].filter((section) => section.items.length > 0).map((section) => (
        <section key={section.key} style={{ marginBottom: 20 }}>
          <h2>
            {section.label} ({section.items.length})
          </h2>

          {section.items.length === 0 ? <p>No todos</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {section.items.map((todo) => (
                <li key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                  <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span>{todo.title}</span>
                      <PriorityBadge priority={todo.priority} />
                      {todo.is_recurring && todo.recurrence_pattern && <RecurrenceBadge pattern={todo.recurrence_pattern} />}
                      {todo.reminder_minutes && <span>Reminder: {REMINDER_LABELS[todo.reminder_minutes as ReminderMinutes]}</span>}
                      {todo.tags?.map((tag) => <span key={tag.id} style={{ color: tag.color }}>{tag.name}</span>)}
                    </div>
                    <small>
                      {todo.due_date ? `Due ${new Date(todo.due_date).toLocaleString()}` : 'No due date'}
                    </small>
                    <SubtaskList todoId={todo.id} subtasks={todo.subtasks ?? []} onChange={reloadTodos} />
                  </div>
                  <select
                    value={todo.priority}
                    onChange={async (event) => {
                      try {
                        await updateTodo(todo, { priority: event.target.value as Priority });
                      } catch (error) {
                        setError(error instanceof Error ? error.message : 'Unable to update priority');
                      }
                    }}
                    style={{ padding: 6 }}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button type="button" onClick={() => deleteTodo(todo.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {visible.overdue.length === 0 && visible.pending.length === 0 && visible.completed.length === 0 && <p>No matching todos</p>}
    </main>
  );
}

export default App;
