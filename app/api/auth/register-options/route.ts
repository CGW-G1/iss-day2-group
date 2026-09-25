import { NextRequest, NextResponse } from 'next/server'
import { challengeDB, userDB } from '@/lib/db'
import { parseUsername } from '@/lib/validation'
import { challengeExpiry, registrationOptions } from '@/lib/webauthn'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: unknown }
    const username = parseUsername(body.username)
    if (userDB.findByUsername(username)) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const options = await registrationOptions(username)
    challengeDB.save(username, 'registration', options.challenge, challengeExpiry())
    return NextResponse.json(options)
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to start registration' }, { status: 400 })
  }
}
