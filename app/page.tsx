'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Priority, Todo } from '@/lib/db';
import { sectionTodos, sortTodos } from '@/lib/todoSort';

const initialTodos: Todo[] = [];

function App() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

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
    return sectionTodos(sortTodos(todos), now);
  }, [todos]);

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

    const optimistic: Todo = {
      id: Date.now(),
      user_id: 1,
      title: trimmed,
      completed: false,
      due_date: dueDate || null,
      priority,
      is_recurring: false,
      recurrence_pattern: null,
      reminder_minutes: null,
      last_notification_sent: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };

    setTodos((current) => sortTodos([...current, optimistic]));
    setTitle('');
    setPriority('medium');
    setDueDate('');
    setError('');

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, priority, due_date: dueDate || null }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to create todo');
      }

      const created = (await response.json()) as Todo;
      setTodos((current) => sortTodos(current.map((todo) => (todo.id === optimistic.id ? created : todo))));
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

      const updated = (await response.json()) as Todo;
      setTodos((current) => sortTodos(current.map((item) => (item.id === todo.id ? updated : item))));
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
      ].map((section) => (
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
                    <div>{todo.title}</div>
                    <small>
                      {todo.priority} {todo.due_date ? `• ${new Date(todo.due_date).toLocaleString()}` : ''}
                    </small>
                  </div>
                  <button type="button" onClick={() => deleteTodo(todo.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}

export default App;
