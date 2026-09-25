import type { RecurrencePattern } from '@/lib/db';
import { fromSingaporeParts, toSingaporeParts } from '@/lib/timezone';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateNextDueDate(currentDueDate: string, pattern: RecurrencePattern): string {
  const { year, month, day, hour, minute, second } = toSingaporeParts(currentDueDate);

  switch (pattern) {
    case 'daily': {
      const next = new Date(Date.UTC(year, month - 1, day + 1, hour, minute, second));
      return fromSingaporeParts({
        year: next.getUTCFullYear(),
        month: next.getUTCMonth() + 1,
        day: next.getUTCDate(),
        hour,
        minute,
        second,
      });
    }
    case 'weekly': {
      const next = new Date(Date.UTC(year, month - 1, day + 7, hour, minute, second));
      return fromSingaporeParts({
        year: next.getUTCFullYear(),
        month: next.getUTCMonth() + 1,
        day: next.getUTCDate(),
        hour,
        minute,
        second,
      });
    }
    case 'monthly': {
      const targetMonth = month === 12 ? 1 : month + 1;
      const targetYear = month === 12 ? year + 1 : year;
      const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
      return fromSingaporeParts({
        year: targetYear,
        month: targetMonth,
        day: clampedDay,
        hour,
        minute,
        second,
      });
    }
    case 'yearly': {
      const targetYear = year + 1;
      const clampedDay = Math.min(day, daysInMonth(targetYear, month));
      return fromSingaporeParts({
        year: targetYear,
        month,
        day: clampedDay,
        hour,
        minute,
        second,
      });
    }
    default: {
      return currentDueDate;
    }
  }
}
