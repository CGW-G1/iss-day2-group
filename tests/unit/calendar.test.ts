import { describe, expect, it } from 'vitest'

import type { Todo } from '@/lib/db'
import { generateCalendarGrid } from '@/lib/calendar'

describe('generateCalendarGrid', () => {
  it('always returns 42 cells and places due todos by local date', () => {
    const cells = generateCalendarGrid(2026, 2, [{ id: 1, due_date: '2026-02-15T10:00:00' }] as unknown as Todo[])
    expect(cells).toHaveLength(42)
    expect(cells.find((cell) => cell.date === '2026-02-15')?.todos).toHaveLength(1)
  })
})
