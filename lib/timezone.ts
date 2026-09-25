export function getSingaporeNow(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
}

export function formatSingaporeDate(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(value);
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
}

export function isSingaporePast(dateValue: string | null): boolean {
  if (!dateValue) return false;
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) return false;
  return value.getTime() < getSingaporeNow().getTime();
}

export function toSingaporeParts(dateValue: string | Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  if (typeof dateValue === 'string') {
    const match = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?$/.exec(dateValue);
    if (!match) {
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date value: ${dateValue}`);
      }
      return toSingaporeParts(parsed);
    }

    const [datePart, timePart] = dateValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const timeParts = timePart.split(':').map((segment) => Number(segment.split('.')[0]));
    const hour = timeParts[0];
    const minute = timeParts[1];
    const second = timeParts[2] ?? 0;

    return { year, month, day, hour, minute, second };
  }

  const value = dateValue;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(value);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second ?? 0),
  };
}

export function fromSingaporeParts(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
}): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second ?? 0)}`;
}

export function singaporeTimestamp(dateValue: string | Date): number {
  const parts = toSingaporeParts(dateValue);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}
