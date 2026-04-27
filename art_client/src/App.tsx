import { useEffect, useMemo, useState } from 'react'
import HomePage from './pages/HomePage'
import ArtistsPage from './pages/ArtistsPage'
import ArtworkPage from './pages/ArtworkPage'

type View = 'home' | 'artists' | 'artwork'

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
  return 'home'
}

function App() {
  const [view, setView] = useState<View>(() => parseViewFromHash(window.location.hash))

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '/home'
    }

    const onHashChange = () => {
      setView(parseViewFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  const page = useMemo(() => {
    if (view === 'home') {
      return <HomePage />
    }
    if (view === 'artwork') {
      return <ArtworkPage />
    }
    return <ArtistsPage />
  }, [view])

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
        </div>
      </header>
      <div className="app-shell">
        <main>{page}</main>
      </div>
    </>
  )
}

export default App
