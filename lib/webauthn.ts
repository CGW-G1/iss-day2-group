import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import type { Authenticator } from './db'

const CHALLENGE_TTL_MS = 5 * 60 * 1000

export function getWebAuthnConfig() {
  const rpName = process.env.RP_NAME ?? 'Todo App'
  const rpID = process.env.RP_ID ?? 'localhost'
  const origin = process.env.RP_ORIGIN ?? 'http://localhost:3000'
  return { rpName, rpID, origin }
}

export function challengeExpiry(): number {
  return Date.now() + CHALLENGE_TTL_MS
}

export async function registrationOptions(username: string) {
  const { rpName, rpID } = getWebAuthnConfig()
  return generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(username),
    userName: username,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  })
}

export async function authenticationOptions(authenticators: Authenticator[]) {
  const { rpID } = getWebAuthnConfig()
  return generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: authenticators.map((authenticator) => ({
      id: authenticator.credential_id,
    })),
  })
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
) {
  const { rpID, origin } = getWebAuthnConfig()
  return verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID })
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  authenticator: Authenticator,
) {
  const { rpID, origin } = getWebAuthnConfig()
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: authenticator.credential_id,
      publicKey: Uint8Array.from(authenticator.credential_public_key),
      counter: authenticator.counter ?? 0,
    },
  })
}

