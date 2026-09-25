import { SignJWT } from 'jose'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
  process.env.DB_PATH = ':memory:'
})

import { resetDatabaseForTests, challengeDB } from '@/lib/db'
import { verifySessionToken } from '@/lib/auth'

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

async function token(overrides: Record<string, unknown> = {}) {
  return new SignJWT({ userId: 1, username: 'test-user', ...overrides })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret())
}

describe('session token verification', () => {
  it('accepts a valid session and rejects tampering', async () => {
    const valid = await token()
    expect(await verifySessionToken(valid)).toEqual({ userId: 1, username: 'test-user' })
    expect(await verifySessionToken(`${valid}tampered`)).toBeNull()
  })

  it('rejects expired and malformed claims', async () => {
    const expired = await new SignJWT({ userId: 1, username: 'test-user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('0s')
      .sign(secret())
    expect(await verifySessionToken(expired)).toBeNull()
    expect(await verifySessionToken(await token({ userId: '1' }))).toBeNull()
  })
})

describe('challenge lifecycle', () => {
  beforeEach(() => {
    resetDatabaseForTests()
  })

  afterEach(() => {
    resetDatabaseForTests()
  })

  it('consumes a valid challenge once', async () => {
    const { challengeDB: store } = await import('@/lib/db')
    store.save('alice', 'authentication', 'challenge-1', 2_000)
    expect(store.consume('alice', 'authentication', 1_000)).toBe('challenge-1')
    expect(store.consume('alice', 'authentication', 1_000)).toBeNull()
  })

  it('rejects expired and mismatched challenges', async () => {
    const { challengeDB: store } = await import('@/lib/db')
    store.save('alice', 'registration', 'challenge-2', 2_000)
    expect(store.consume('bob', 'registration', 1_000)).toBeNull()
    expect(store.consume('alice', 'registration', 2_000)).toBeNull()
  })

  it('keeps a challenge after a mismatched verification attempt', async () => {
    const { challengeDB: store } = await import('@/lib/db')
    store.save('alice', 'authentication', 'challenge-3', 2_000)
    expect(store.consumeExpected('alice', 'authentication', 'wrong', 1_000)).toBe(false)
    expect(store.get('alice', 'authentication', 1_000)).toBe('challenge-3')
    expect(store.consumeExpected('alice', 'authentication', 'challenge-3', 1_000)).toBe(true)
    expect(store.get('alice', 'authentication', 1_000)).toBeNull()
  })
})
