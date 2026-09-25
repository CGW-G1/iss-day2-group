import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { authenticatorDB, challengeDB, userDB } from '@/lib/db'
import { parseUsername } from '@/lib/validation'
import { verifyAuthentication } from '@/lib/webauthn'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: unknown; response?: AuthenticationResponseJSON }
    const username = parseUsername(body.username)
    if (!body.response) return NextResponse.json({ error: 'Authentication response is required' }, { status: 400 })

    const user = userDB.findByUsername(username)
    const authenticator = body.response.id ? authenticatorDB.findByCredentialId(body.response.id) : null
    if (!user || !authenticator || authenticator.user_id !== user.id) {
      return NextResponse.json({ error: 'Authenticator not recognized' }, { status: 401 })
    }

    const expectedChallenge = challengeDB.get(username, 'authentication')
    if (!expectedChallenge) return NextResponse.json({ error: 'Authentication challenge expired or already used' }, { status: 401 })

    const verification = await verifyAuthentication(body.response, expectedChallenge, authenticator)
    if (!verification.verified) return NextResponse.json({ error: 'Verification failed' }, { status: 401 })

    if (!challengeDB.consumeExpected(username, 'authentication', expectedChallenge)) {
      return NextResponse.json({ error: 'Authentication challenge expired or already used' }, { status: 401 })
    }

    authenticatorDB.updateCounter(authenticator.id, verification.authenticationInfo.newCounter ?? 0)
    await createSession(user)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
  }
}
