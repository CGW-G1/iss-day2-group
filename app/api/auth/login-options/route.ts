import { NextRequest, NextResponse } from 'next/server'
import { challengeDB, authenticatorDB, userDB } from '@/lib/db'
import { parseUsername } from '@/lib/validation'
import { authenticationOptions, challengeExpiry } from '@/lib/webauthn'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: unknown }
    const username = parseUsername(body.username)
    const user = userDB.findByUsername(username)
    if (!user) return NextResponse.json({ error: 'Unable to authenticate with these credentials' }, { status: 401 })

    const options = await authenticationOptions(authenticatorDB.findByUserId(user.id))
    challengeDB.save(username, 'authentication', options.challenge, challengeExpiry())
    return NextResponse.json(options)
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to authenticate with these credentials' }, { status: 400 })
  }
}
