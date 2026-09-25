import { describe, expect, it } from 'vitest'

import type { Todo } from '@/lib/db'
import { calculateNextDueDate } from '@/lib/recurrence'
import { compareTodos } from '@/lib/todoSort'
import { validatePriority } from '@/lib/validation'

describe('validatePriority', () => {
  it('accepts the supported values and defaults unset values to medium', () => {
    expect(validatePriority('high')).toBe('high')
    expect(validatePriority('medium')).toBe('medium')
    expect(validatePriority('low')).toBe('low')
    expect(validatePriority(undefined)).toBe('medium')
  })

  it('rejects invalid and uppercase inputs', () => {
    expect(() => validatePriority('urgent')).toThrow("Invalid priority: urgent. Must be 'high', 'medium', or 'low'.")
    expect(() => validatePriority('HIGH')).toThrow("Invalid priority: HIGH. Must be 'high', 'medium', or 'low'.")
  })
})

describe('compareTodos', () => {
  it('orders by priority, due date, then newest creation', () => {
    const todos = [
      { id: 1, priority: 'low', due_date: '2025-06-20T10:00:00', created_at: '2025-06-01T09:00:00' },
      { id: 2, priority: 'high', due_date: '2025-06-18T10:00:00', created_at: '2025-06-02T09:00:00' },
      { id: 3, priority: 'low', due_date: null, created_at: '2025-06-04T09:00:00' },
      { id: 4, priority: 'medium', due_date: '2025-06-18T10:00:00', created_at: '2025-06-03T09:00:00' },
    ] as unknown as Todo[]

    expect(todos.slice().sort(compareTodos).map((todo) => todo.id)).toEqual([2, 4, 1, 3])
  })
})

describe('calculateNextDueDate', () => {
  it('adds one day and one week without changing the time component', () => {
    expect(calculateNextDueDate('2025-11-10T14:00:00', 'daily')).toBe('2025-11-11T14:00:00')
    expect(calculateNextDueDate('2025-11-10T14:00:00', 'weekly')).toBe('2025-11-17T14:00:00')
  })

  it('clamps monthly rollover to the last valid day in the target month', () => {
    expect(calculateNextDueDate('2025-01-31T09:00:00', 'monthly')).toBe('2025-02-28T09:00:00')
    expect(calculateNextDueDate('2024-01-31T09:00:00', 'monthly')).toBe('2024-02-29T09:00:00')
    expect(calculateNextDueDate('2025-12-31T09:00:00', 'monthly')).toBe('2026-01-31T09:00:00')
  })

  it('matches yearly recurrence and leap-day clamp rules', () => {
    expect(calculateNextDueDate('2025-06-15T09:00:00', 'yearly')).toBe('2026-06-15T09:00:00')
    expect(calculateNextDueDate('2024-02-29T09:00:00', 'yearly')).toBe('2025-02-28T09:00:00')
  })
})
