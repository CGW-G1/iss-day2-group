# PR-11: WebAuthn and Passkey Authentication

**Source:** [`PRPs/11-authentication-webauthn.md`](../PRPs/11-authentication-webauthn.md)  
**Priority:** P0 infrastructure

## Objective

Implement passwordless registration and login with WebAuthn passkeys, JWT-backed HTTP-only sessions, logout, and protected routes.

## Scope

- Add `users` and `authenticators` tables with one-to-many credentials.
- Add challenge storage with single-use, short-lived registration/login challenges.
- Implement register-options, register-verify, login-options, login-verify, logout, and me routes.
- Use `isoBase64URL` for credential IDs and `counter ?? 0` at every auth counter boundary.
- Add `createSession`, `getSession`, and `deleteSession` with seven-day secure cookie settings.
- Protect `/` and `/calendar` in middleware and add the passkey login page.

## Contract

No passwords or OAuth. Duplicate usernames return `409`; unknown credentials fail closed. JWT failures return no session rather than uncaught errors. A user may register multiple authenticators. Registration/login client errors, cancellation, and unsupported devices receive actionable UI feedback.

## Implementation Surface

`lib/db.ts`, `lib/auth.ts`, challenge store, `middleware.ts`, `app/login/page.tsx`, `app/api/auth/**`, environment configuration.

## Acceptance Checks

- [ ] Registration creates user, authenticator, and session.
- [ ] Login succeeds with any registered authenticator and updates its counter.
- [ ] Counter reads/writes use `?? 0`; stale non-zero counters are rejected.
- [ ] Session cookie is HTTP-only, SameSite Lax, secure in production, and expires after seven days.
- [ ] Logout clears access and protected routes redirect/return `401`.
- [ ] Authenticated users are redirected away from `/login`.

## Validation

Unit-test session round trips, tamper/expiry rejection, and counter logic. Add virtual-WebAuthn Playwright coverage in `tests/01-authentication.spec.ts`; run security review, lint, and build before merging.
