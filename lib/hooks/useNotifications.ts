'use client';

import { useEffect, useRef, useState } from 'react';
import type { Todo } from '@/lib/db';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const polling = useRef(false);

  async function requestPermission() {
    if (typeof Notification === 'undefined') return;
    setPermission(await Notification.requestPermission());
  }

  useEffect(() => {
    if (permission !== 'granted') return;

    async function poll() {
      if (Notification.permission !== 'granted') return;
      if (polling.current) return;
      polling.current = true;
      try {
        const response = await fetch('/api/notifications/check');
        if (!response.ok) return;
        const payload = await response.json() as { data: Todo[] };
        for (const todo of payload.data) {
          if (Notification.permission !== 'granted') {
            window.clearInterval(interval);
            return;
          }
          new Notification(todo.title, { body: `Due ${todo.due_date ?? ''}`, tag: `todo-${todo.id}` });
          const stampResponse = await fetch(`/api/todos/${todo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ last_notification_sent: new Date().toISOString() }),
          });
          if (!stampResponse.ok) return;
        }
      } finally {
        polling.current = false;
      }
    }

    const interval = window.setInterval(() => void poll(), 30_000);
    void poll();
    return () => window.clearInterval(interval);
  }, [permission]);

  return { permission, requestPermission };
}