import { describe, expect, it } from 'vitest'

import type { Subtask } from '@/lib/db'
import { calculateProgress } from '@/lib/progress'

describe('calculateProgress', () => {
  it('returns zero for an empty checklist', () => {
    expect(calculateProgress([])).toEqual({ completed: 0, total: 0, percent: 0 })
  })

  it('rounds partial progress to the nearest whole percentage', () => {
    expect(calculateProgress([
      { completed: true },
      { completed: true },
      { completed: true },
      { completed: false },
      { completed: false },
      { completed: false },
      { completed: false },
    ] as Pick<Subtask, 'completed'>[])).toEqual({ completed: 3, total: 7, percent: 43 })
  })

  it('reports complete progress when every subtask is complete', () => {
    expect(calculateProgress([{ completed: true }, { completed: true }] as Pick<Subtask, 'completed'>[])).toEqual({
      completed: 2,
      total: 2,
      percent: 100,
    })
  })
})
