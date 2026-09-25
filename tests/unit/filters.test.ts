import { describe, expect, it } from 'vitest'

import type { Todo } from '@/lib/db'
import { applyFilters, DEFAULT_FILTER_STATE, hasActiveFilters } from '@/lib/filters'

const todos = [
  { id: 1, title: 'Plan launch', priority: 'high', completed: false, due_date: '2026-09-26T10:00:00', tags: [{ id: 1 }], subtasks: [{ title: 'Draft brief', completed: false }] },
  { id: 2, title: 'Buy supplies', priority: 'low', completed: true, due_date: null, tags: [], subtasks: [] },
] as unknown as Todo[]

describe('applyFilters', () => {
  it('matches todo and subtask titles with AND filters', () => {
    expect(applyFilters(todos, { ...DEFAULT_FILTER_STATE, search: 'brief', priority: 'high' }).map((todo) => todo.id)).toEqual([1])
    expect(applyFilters(todos, { ...DEFAULT_FILTER_STATE, search: 'plan', completion: 'completed' })).toEqual([])
  })

  it('excludes undated todos from date ranges', () => {
    expect(applyFilters(todos, { ...DEFAULT_FILTER_STATE, dueDateFrom: '2026-09-25' }).map((todo) => todo.id)).toEqual([1])
  })
})

describe('hasActiveFilters', () => {
  it('recognizes default and active states', () => {
    expect(hasActiveFilters(DEFAULT_FILTER_STATE)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, search: 'launch' })).toBe(true)
  })
})
