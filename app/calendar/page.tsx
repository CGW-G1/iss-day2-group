'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Todo } from '@/lib/db';
import { generateCalendarGrid } from '@/lib/calendar';
import { toSingaporeParts } from '@/lib/timezone';

function currentMonth() {
  const parts = toSingaporeParts(new Date());
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
}

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(searchParams.get('month') ?? currentMonth());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string }>>([]);
  const queryMonth = searchParams.get('month');
  const activeMonth = queryMonth && /^\d{4}-\d{2}$/.test(queryMonth) ? queryMonth : month;

  useEffect(() => {
    fetch('/api/todos').then(async (response) => {
      if (response.ok) setTodos((await response.json()) as Todo[]);
    });
  }, []);

  useEffect(() => {
    fetch(`/api/holidays?month=${activeMonth}`).then(async (response) => {
      if (response.ok) setHolidays((await response.json()) as Array<{ date: string; name: string }>);
    });
  }, [activeMonth]);

  const [year, monthNumber] = activeMonth.split('-').map(Number);
  const cells = useMemo(() => generateCalendarGrid(year, monthNumber, todos), [monthNumber, todos, year]);

  function shiftMonth(offset: number) {
    const value = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    const next = value.toISOString().slice(0, 7);
    setMonth(next);
    router.push(`/calendar?month=${next}`);
  }

  return (
    <main style={{ maxWidth: 1100, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Calendar</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => shiftMonth(-1)}>Previous</button>
          <button type="button" onClick={() => { const next = currentMonth(); setMonth(next); router.push(`/calendar?month=${next}`); }}>Today</button>
          <button type="button" onClick={() => shiftMonth(1)}>Next</button>
        </div>
      </div>
      <h2>{activeMonth}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#d1d5db' }}>
        {cells.map((cell) => (
          <div key={cell.date} style={{ minHeight: 110, background: cell.currentMonth ? '#fff' : '#f3f4f6', padding: 8 }}>
            <strong>{cell.day}</strong>
            {holidays.filter((holiday) => holiday.date === cell.date).map((holiday) => <small key={holiday.date} style={{ display: 'block', color: '#b45309' }}>{holiday.name}</small>)}
            {cell.todos.slice(0, 3).map((todo) => <div key={todo.id} style={{ marginTop: 6, fontSize: 12 }}>{todo.title}</div>)}
            {cell.todos.length > 3 && <small>+{cell.todos.length - 3} more</small>}
          </div>
        ))}
      </div>
    </main>
  );
}

export default function CalendarPage() {
  return <Suspense fallback={<main style={{ padding: 32 }}>Loading calendar...</main>}><CalendarContent /></Suspense>;
}
