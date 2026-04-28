import { useEffect, useMemo, useRef, useState } from 'react'
import HomePage from './pages/HomePage'
import ArtistsPage from './pages/ArtistsPage'
import ArtworkPage from './pages/ArtworkPage'
import AboutPage from './pages/AboutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountSettingsPage from './pages/AccountSettingsPage'
import type { AuthResponse, AuthUser } from './types/auth'
import { getCurrentUser } from './utils/auth'

type View =
  | 'home'
  | 'artists'
  | 'artwork'
  | 'about'
  | 'login'
  | 'register'
  | 'account'

const AUTH_TOKEN_STORAGE_KEY = 'artapp.authToken'

const PRIMARY_NAV_ITEMS: Array<{ label: string; href: string; view: View }> = [
  { label: 'Home', href: '#/home', view: 'home' },
  { label: 'Artwork', href: '#/artwork', view: 'artwork' },
  { label: 'Artists', href: '#/artists', view: 'artists' },
  { label: 'About', href: '#/about', view: 'about' },
]

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
  if (value === 'about') {
    return 'about'
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '/home'
    }

    const onHashChange = () => {
      setView(parseViewFromHash(window.location.hash))
      setAccountMenuOpen(false)
      setMobileNavOpen(false)
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
    const handleResize = () => {
      if (window.innerWidth > 700) {
        setMobileNavOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

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
    setMobileNavOpen(false)
    window.location.hash = '/account'
  }

  const handleLogout = () => {
    setAuthUser(null)
    setAuthToken(null)
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    setAccountMenuOpen(false)
    setMobileNavOpen(false)
    window.location.hash = '/home'
  }

  const accountLabel = authUser?.displayName?.trim() || authUser?.email || 'Account'

  const renderPrimaryNav = (className: string, onNavigate?: () => void) =>
    PRIMARY_NAV_ITEMS.map((item) => (
      <a
        href={item.href}
        className={`${className} ${view === item.view ? 'active' : ''}`}
        key={item.view}
        onClick={onNavigate}
      >
        {item.label}
      </a>
    ))

  const page = useMemo(() => {
    if (view === 'home') {
      return <HomePage />
    }
    if (view === 'about') {
      return <AboutPage />
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
          <div className="top-nav-left">
            <button
              type="button"
              className={`nav-menu-toggle ${mobileNavOpen ? 'open' : ''}`}
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNavOpen}
              onClick={() => {
                setMobileNavOpen((prev) => !prev)
                setAccountMenuOpen(false)
              }}
            >
              <span className="nav-menu-line" />
              <span className="nav-menu-line" />
              <span className="nav-menu-line" />
            </button>
            <a
              href="#/home"
              className="nav-brand"
              onClick={() => setMobileNavOpen(false)}
            >
              MoMA
            </a>
          </div>

          <nav className="top-nav-links" aria-label="Primary">
            {renderPrimaryNav('nav-link')}
          </nav>

          <div className="top-nav-auth">
            {authLoading ? (
              <span className="nav-auth-status">Checking session...</span>
            ) : authUser ? (
              <div
                className="nav-account"
                ref={accountMenuRef}
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <button
                  type="button"
                  className={`nav-account-btn ${
                    view === 'account' || accountMenuOpen ? 'active' : ''
                  }`}
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                >
                  <span>{accountLabel}</span>
                  <span
                    className={`nav-account-arrow ${accountMenuOpen ? 'open' : ''}`}
                    aria-hidden="true"
                  />
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
                      className="nav-account-link nav-account-button nav-account-link-danger"
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
                  onClick={() => setMobileNavOpen(false)}
                >
                  Login
                </a>
                <a
                  href="#/register"
                  className={`nav-auth-btn nav-auth-btn-primary ${
                    view === 'register' ? 'active' : ''
                  }`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Sign Up
                </a>
              </>
            )}
          </div>
        </div>

        {mobileNavOpen && (
          <div className="mobile-nav-panel">
            <a
              href="#/home"
              className="mobile-nav-brand"
              onClick={() => setMobileNavOpen(false)}
            >
              MoMA
            </a>
            <nav className="mobile-nav-links" aria-label="Mobile Primary">
              {renderPrimaryNav('nav-link mobile-nav-link', () => setMobileNavOpen(false))}
            </nav>
          </div>
        )}
      </header>

      <div className="app-shell">
        <main>{page}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <p className="site-footer-brand">MoMA Collection Explorer</p>
            <p className="site-footer-copy">
              Explore artists, artworks, and the stories behind modern art.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

export default App
