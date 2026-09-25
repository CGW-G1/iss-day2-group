import { NextRequest, NextResponse } from 'next/server'
import { authenticatorDB, challengeDB, db, userDB } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { parseUsername } from '@/lib/validation'
import { verifyRegistration } from '@/lib/webauthn'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: unknown; response?: RegistrationResponseJSON }
    const username = parseUsername(body.username)
    if (!body.response) return NextResponse.json({ error: 'Registration response is required' }, { status: 400 })
    if (userDB.findByUsername(username)) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

    const expectedChallenge = challengeDB.get(username, 'registration')
    if (!expectedChallenge) return NextResponse.json({ error: 'Registration challenge expired or already used' }, { status: 401 })

    const verification = await verifyRegistration(body.response, expectedChallenge)
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
    }

    if (!challengeDB.consumeExpected(username, 'registration', expectedChallenge)) {
      return NextResponse.json({ error: 'Registration challenge expired or already used' }, { status: 401 })
    }

    const { credential, aaguid } = verification.registrationInfo
    const createAccount = db.transaction(() => {
      const user = userDB.create(username)
      authenticatorDB.create({
        user_id: user.id,
        credential_id: credential.id,
        credential_public_key: Buffer.from(credential.publicKey),
        counter: credential.counter ?? 0,
      })
      return user
    })

    const user = createAccount()
    await createSession(user)
    return NextResponse.json({ success: true, aaguid })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
  }
}
