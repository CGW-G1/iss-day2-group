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
