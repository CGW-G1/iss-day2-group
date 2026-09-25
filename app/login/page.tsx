'use client'

import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Action = 'register' | 'login'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Action | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/auth/me').then((response) => {
      if (active && response.ok) router.replace('/')
    }).catch(() => undefined)
    return () => {
      active = false
    }
  }, [router])

  async function run(action: Action) {
    setError(null)
    setBusy(action)
    try {
      const optionsResponse = await fetch(`/api/auth/${action === 'register' ? 'register' : 'login'}-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const optionsBody = await optionsResponse.json() as { error?: string }
      if (!optionsResponse.ok) throw new Error(optionsBody.error ?? 'Unable to start authentication')

      const credential = action === 'register'
        ? await startRegistration(optionsBody as never)
        : await startAuthentication(optionsBody as never)
      const verifyResponse = await fetch(`/api/auth/${action === 'register' ? 'register' : 'login'}-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, response: credential }),
      })
      const verifyBody = await verifyResponse.json() as { error?: string }
      if (!verifyResponse.ok) throw new Error(verifyBody.error ?? 'Authentication failed')
      router.replace('/')
    } catch (caught) {
      const authError = caught as { name?: string; message?: string }
      setError(authError.name === 'NotAllowedError'
        ? 'Authentication was cancelled. You can try again.'
        : authError.message ?? 'This browser or device could not complete passkey authentication.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '12vh 1.5rem' }}>
      <p style={{ color: '#926c15', letterSpacing: '.08em', textTransform: 'uppercase' }}>Todo App</p>
      <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', lineHeight: .95, margin: '.5rem 0 1rem' }}>Bring your own key.</h1>
      <p>Use a passkey from this device or a security key. No password is stored.</p>
      <form onSubmit={(event) => event.preventDefault()} style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            maxLength={100}
            style={{ display: 'block', width: '100%', marginTop: '.4rem', padding: '.7rem' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => run('register')} disabled={!username.trim() || busy !== null}>
            {busy === 'register' ? 'Registering...' : 'Register passkey'}
          </button>
          <button type="button" onClick={() => run('login')} disabled={!username.trim() || busy !== null}>
            {busy === 'login' ? 'Checking...' : 'Log in'}
          </button>
        </div>
        {error && <p role="alert" style={{ color: '#a12626', margin: 0 }}>{error}</p>}
      </form>
    </main>
  )
}
