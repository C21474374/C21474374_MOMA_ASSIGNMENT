import { useEffect, useMemo, useState } from 'react'
import ArtistsPage from './pages/ArtistsPage'
import ArtworkPage from './pages/ArtworkPage'

type View = 'artists' | 'artwork'

function parseViewFromHash(hash: string): View {
  const value = hash.replace(/^#\/?/, '').toLowerCase()
  if (value === 'artwork') {
    return 'artwork'
  }
  return 'artists'
}

function App() {
  const [view, setView] = useState<View>(() => parseViewFromHash(window.location.hash))

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '/artists'
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
    if (view === 'artwork') {
      return <ArtworkPage />
    }
    return <ArtistsPage />
  }, [view])

  return (
    <div className="app-shell">
      <header className="top-nav">
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
      </header>
      <main>{page}</main>
    </div>
  )
}

export default App
