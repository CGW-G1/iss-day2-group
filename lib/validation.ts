import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .min(1, 'Username is required')
  .max(100, 'Username is too long')
  .regex(/^[A-Za-z0-9._-]+$/, 'Username contains invalid characters')

export function parseUsername(value: unknown): string {
  return usernameSchema.parse(value)
}
