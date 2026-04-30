import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import AuthPageLayout from '../components/AuthPageLayout'
import { consumeAuthRedirectNotice, loginUser } from '../utils/auth'
import type { AuthResponse } from '../types/auth'

type LoginPageProps = {
  onAuthSuccess: (response: AuthResponse) => void
}

// Submit credentials to the auth API and hand the session back to the app shell.
function LoginPage({ onAuthSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setNotice(consumeAuthRedirectNotice())
  }, [])

  // Submit the login form and surface API validation errors back into the page.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await loginUser({
        email: email.trim(),
        password,
      })
      onAuthSuccess(response)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to log in right now'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      title="Login"
      subtitle="Sign in to keep your likes and account details tied to one profile."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {notice && <p className="auth-notice">{notice}</p>}

        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Password</span>
          <input
            type="password"
            className="auth-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="show-more-btn auth-submit-btn" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Need an account?</span>
        <a href="#/register" className="modal-link">
          Create one here
        </a>
      </div>
    </AuthPageLayout>
  )
}

export default LoginPage
