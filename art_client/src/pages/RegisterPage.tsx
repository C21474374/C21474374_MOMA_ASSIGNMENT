import { useState } from 'react'
import type { FormEvent } from 'react'
import AuthPageLayout from '../components/AuthPageLayout'
import type { AuthResponse } from '../types/auth'
import { registerUser } from '../utils/auth'

type RegisterPageProps = {
  onAuthSuccess: (response: AuthResponse) => void
}

// Collect new account details, validate them, and register the user through the auth API.
function RegisterPage({ onAuthSuccess }: RegisterPageProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Submit the registration form after checking the password confirmation locally.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await registerUser({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      })
      onAuthSuccess(response)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create an account right now'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      title="Register"
      subtitle="Create a personal profile so your likes follow you across sessions."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-label">Display Name</span>
          <input
            type="text"
            className="auth-input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How you want your name shown"
            autoComplete="name"
          />
        </label>

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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Confirm Password</span>
          <input
            type="password"
            className="auth-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="show-more-btn auth-submit-btn" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Already registered?</span>
        <a href="#/login" className="modal-link">
          Log in instead
        </a>
      </div>
    </AuthPageLayout>
  )
}

export default RegisterPage
