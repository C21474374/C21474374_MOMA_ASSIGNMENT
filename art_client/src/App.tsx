import { useEffect, useMemo, useRef, useState } from 'react'
import HomePage from './pages/HomePage'
import ArtistsPage from './pages/ArtistsPage'
import ArtworkPage from './pages/ArtworkPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountSettingsPage from './pages/AccountSettingsPage'
import type { AuthResponse, AuthUser } from './types/auth'
import { getCurrentUser } from './utils/auth'

type View = 'home' | 'artists' | 'artwork' | 'login' | 'register' | 'account'

const AUTH_TOKEN_STORAGE_KEY = 'artapp.authToken'

function parseViewFromHash(hash: string): View {
  const value = hash.replace(/^#\/?/, '').toLowerCase()
  if (value === 'home') {
    return 'home'
  }
  if (value === 'artwork') {
    return 'artwork'
  }
  if (value === 'artists') {
    return 'artists'
  }
  if (value === 'login') {
    return 'login'
  }
  if (value === 'register') {
    return 'register'
  }
  if (value === 'account') {
    return 'account'
  }
  return 'home'
}

function App() {
  const [view, setView] = useState<View>(() => parseViewFromHash(window.location.hash))
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authToken, setAuthToken] = useState(() => {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  })
  const [authLoading, setAuthLoading] = useState(true)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '/home'
    }

    const onHashChange = () => {
      setView(parseViewFromHash(window.location.hash))
      setAccountMenuOpen(false)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!authToken) {
      setAuthLoading(false)
      return () => {
        isMounted = false
      }
    }

    const loadCurrentUser = async () => {
      try {
        const currentUser = await getCurrentUser(authToken)
        if (isMounted) {
          setAuthUser(currentUser)
        }
      } catch {
        if (isMounted) {
          setAuthUser(null)
          setAuthToken(null)
          window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [authToken])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (authUser && (view === 'login' || view === 'register')) {
      window.location.hash = '/account'
      return
    }

    if (!authUser && view === 'account') {
      window.location.hash = '/login'
    }
  }, [authLoading, authUser, view])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  const handleAuthSuccess = (response: AuthResponse) => {
    setAuthUser(response.user)
    setAuthToken(response.token)
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token)
    setAccountMenuOpen(false)
    window.location.hash = '/account'
  }

  const handleLogout = () => {
    setAuthUser(null)
    setAuthToken(null)
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    setAccountMenuOpen(false)
    window.location.hash = '/home'
  }

  const accountLabel = authUser?.displayName?.trim() || authUser?.email || 'Account'

  const page = useMemo(() => {
    if (view === 'home') {
      return <HomePage />
    }
    if (view === 'login') {
      return <LoginPage onAuthSuccess={handleAuthSuccess} />
    }
    if (view === 'register') {
      return <RegisterPage onAuthSuccess={handleAuthSuccess} />
    }
    if (view === 'account') {
      return <AccountSettingsPage user={authUser} />
    }
    if (view === 'artwork') {
      return <ArtworkPage />
    }
    return <ArtistsPage />
  }, [authUser, view])

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          <a href="#/home" className="nav-brand">
            MoMA
          </a>
          <nav className="top-nav-links" aria-label="Primary">
            <a
              href="#/home"
              className={`nav-link ${view === 'home' ? 'active' : ''}`}
            >
              Home
            </a>
            <a
              href="#/artists"
              className={`nav-link ${view === 'artists' ? 'active' : ''}`}
            >
              Artists
            </a>
            <a
              href="#/artwork"
              className={`nav-link ${view === 'artwork' ? 'active' : ''}`}
            >
              Artwork
            </a>
          </nav>
          <div className="top-nav-auth">
            {authLoading ? (
              <span className="nav-auth-status">Checking session...</span>
            ) : authUser ? (
              <div className="nav-account" ref={accountMenuRef}>
                <button
                  type="button"
                  className={`nav-account-btn ${
                    view === 'account' || accountMenuOpen ? 'active' : ''
                  }`}
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                >
                  {accountLabel}
                </button>
                {accountMenuOpen && (
                  <div className="nav-account-dropdown" role="menu">
                    <a
                      href="#/account"
                      className="nav-account-link"
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      Account Settings
                    </a>
                    <button
                      type="button"
                      className="nav-account-link nav-account-button"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <a
                  href="#/login"
                  className={`nav-auth-btn ${view === 'login' ? 'active' : ''}`}
                >
                  Login
                </a>
                <a
                  href="#/register"
                  className={`nav-auth-btn nav-auth-btn-primary ${
                    view === 'register' ? 'active' : ''
                  }`}
                >
                  Sign Up
                </a>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="app-shell">
        <main>{page}</main>
      </div>
    </>
  )
}

export default App
