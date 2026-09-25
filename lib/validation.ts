import { z } from 'zod'

import type { Priority, RecurrencePattern } from '@/lib/db'

export const usernameSchema = z
  .string()
  .trim()
  .min(1, 'Username is required')
  .max(100, 'Username is too long')
  .regex(/^[A-Za-z0-9._-]+$/, 'Username contains invalid characters')

export function parseUsername(value: unknown): string {
  return usernameSchema.parse(value)
}

export const prioritySchema = z.enum(['high', 'medium', 'low'])

export function validatePriority(value: unknown): Priority {
  if (value === undefined || value === null) {
    return 'medium'
  }

  const parsed = prioritySchema.safeParse(value)
  if (!parsed.success) {
    throw new Error(`Invalid priority: ${String(value)}. Must be 'high', 'medium', or 'low'.`)
  }

  return parsed.data
}

export const recurrencePatternSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly'])

export function validateRecurrencePattern(value: unknown): RecurrencePattern {
  const parsed = recurrencePatternSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error(`Invalid recurrence pattern: ${String(value)}. Must be 'daily', 'weekly', 'monthly', or 'yearly'.`)
  }

  return parsed.data
}

export const REMINDER_MINUTES = [15, 30, 60, 120, 1440, 2880, 10080] as const

export function validateReminderMinutes(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !REMINDER_MINUTES.includes(value as (typeof REMINDER_MINUTES)[number])) {
    throw new Error('Invalid reminder_minutes')
  }
  return value
}
