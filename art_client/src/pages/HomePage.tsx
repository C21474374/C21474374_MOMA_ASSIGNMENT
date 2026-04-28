import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'
import DetailsModal from '../components/DetailsModal'
import momaHeroImage from '../assets/moma_pic_irl.jpg'

const FEATURE_LIMIT = 12
const RELATED_ARTWORK_LIMIT = 200
const CAROUSEL_PAGE_SIZE = 3

const ARTIST_HIDDEN_FIELDS = new Set([
  '_id',
  'DisplayName',
  'ArtistBio',
  'Nationality',
  'Gender',
  'BeginDate',
  'EndDate',
  'ConstituentID',
  'ULAN',
  'Wiki QID',
  'Likes',
])

const ARTWORK_HIDDEN_FIELDS = new Set([
  '_id',
  'Title',
  'Artist',
  'Date',
  'Medium',
  'Classification',
  'Department',
  'Dimensions',
  'Height (cm)',
  'Width (cm)',
  'Depth (cm)',
  'CreditLine',
  'AccessionNumber',
  'DateAcquired',
  'Cataloged',
  'ObjectID',
  'URL',
  'ImageURL',
  'OnView',
  'Likes',
])

type Artist = {
  _id: string
  DisplayName?: string
  ArtistBio?: string
  Nationality?: string
  Gender?: string
  BeginDate?: number
  EndDate?: number
  ConstituentID?: number
  ULAN?: string
  ['Wiki QID']?: string
  Likes?: number
  [key: string]: unknown
}

type ArtworkSummary = {
  _id: string
  Title?: string
  Date?: string
  Artist?: string[] | string
  ConstituentID?: number[] | number
  ArtistBio?: string[] | string
  BeginDate?: number[] | number
  EndDate?: number[] | number
  Nationality?: string[] | string
  Gender?: string[] | string
  Medium?: string
  Classification?: string
  Department?: string
  Dimensions?: string
  ['Height (cm)']?: number
  ['Width (cm)']?: number
  ['Depth (cm)']?: number
  CreditLine?: string
  AccessionNumber?: string
  DateAcquired?: string
  Cataloged?: string
  ObjectID?: number
  URL?: string
  OnView?: string
  ImageURL?: string
  Likes?: number
  [key: string]: unknown
}

function asDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'N/A'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'N/A'
    }
    return value.join(', ')
  }
  return String(value)
}

function getArtistLabel(artist: ArtworkSummary['Artist']) {
  if (Array.isArray(artist)) {
    return artist.filter(Boolean).join(', ')
  }

  if (typeof artist === 'string') {
    return artist
  }

  return 'Unknown artist'
}

function getArtistMeta(artist: Artist) {
  const nationality = artist.Nationality || 'Unknown nationality'
  const start = artist.BeginDate ? String(artist.BeginDate) : ''
  const end = artist.EndDate ? String(artist.EndDate) : ''

  if (!start && !end) {
    return nationality
  }

  return `${nationality} - ${start || '?'}${end ? `-${end}` : ''}`
}

function hasMatchingConstituent(
  artworkConstituent: number[] | number | undefined,
  artistConstituent: number
) {
  if (Array.isArray(artworkConstituent)) {
    return artworkConstituent.some((value) => Number(value) === artistConstituent)
  }

  if (typeof artworkConstituent === 'number') {
    return Number(artworkConstituent) === artistConstituent
  }

  return false
}

function hasMatchingArtistName(
  artworkArtist: string[] | string | undefined,
  artistName: string
) {
  if (!artistName) {
    return false
  }

  if (Array.isArray(artworkArtist)) {
    return artworkArtist.some(
      (name) => String(name).trim().toLowerCase() === artistName
    )
  }

  if (typeof artworkArtist === 'string') {
    return artworkArtist.trim().toLowerCase() === artistName
  }

  return false
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: unknown
}) {
  return (
    <div className="modal-info-row">
      <span className="modal-info-label">{label}</span>
      <span className="modal-info-value">{asDisplayValue(value)}</span>
    </div>
  )
}

function scrollTrack(
  trackRef: RefObject<HTMLDivElement | null>,
  direction: 'next' | 'prev'
) {
  if (!trackRef.current) {
    return
  }

  const offset = trackRef.current.clientWidth * 0.85
  trackRef.current.scrollBy({
    left: direction === 'next' ? offset : -offset,
    behavior: 'smooth',
  })
}

function HomePage() {
  const [artwork, setArtwork] = useState<ArtworkSummary[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [likedArtworkIds, setLikedArtworkIds] = useState<Set<string>>(new Set())
  const [likedArtistIds, setLikedArtistIds] = useState<Set<string>>(new Set())
  const [likedRelatedArtworkIds, setLikedRelatedArtworkIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkSummary | null>(null)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [selectedRelatedArtwork, setSelectedRelatedArtwork] =
    useState<ArtworkSummary | null>(null)
  const [artworkDetailsLoading, setArtworkDetailsLoading] = useState(false)
  const [artistDetailsLoading, setArtistDetailsLoading] = useState(false)
  const [relatedArtwork, setRelatedArtwork] = useState<ArtworkSummary[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedDetailsLoading, setRelatedDetailsLoading] = useState(false)
  const [relatedCarouselPage, setRelatedCarouselPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const artworkTrackRef = useRef<HTMLDivElement | null>(null)
  const artistTrackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadHighlights = async () => {
      try {
        setLoading(true)

        const [artworkResponse, artistsResponse] = await Promise.all([
          fetch(`/api/artwork?limit=${FEATURE_LIMIT}`),
          fetch(`/api/artists?limit=${FEATURE_LIMIT}`),
        ])

        if (!artworkResponse.ok || !artistsResponse.ok) {
          throw new Error('Failed to load homepage highlights')
        }

        const [artworkData, artistData] = (await Promise.all([
          artworkResponse.json(),
          artistsResponse.json(),
        ])) as [ArtworkSummary[], Artist[]]

        if (isMounted) {
          setArtwork(artworkData)
          setArtists(artistData)
          setError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load homepage highlights'
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadHighlights()

    return () => {
      isMounted = false
    }
  }, [])

  const updateArtworkState = (artworkId: string, changes: Partial<ArtworkSummary>) => {
    setArtwork((prev) =>
      prev.map((item) => (item._id === artworkId ? { ...item, ...changes } : item))
    )
    setSelectedArtwork((prev) =>
      prev && prev._id === artworkId ? { ...prev, ...changes } : prev
    )
    setRelatedArtwork((prev) =>
      prev.map((item) => (item._id === artworkId ? { ...item, ...changes } : item))
    )
    setSelectedRelatedArtwork((prev) =>
      prev && prev._id === artworkId ? { ...prev, ...changes } : prev
    )
  }

  const updateArtistState = (artistId: string, changes: Partial<Artist>) => {
    setArtists((prev) =>
      prev.map((item) => (item._id === artistId ? { ...item, ...changes } : item))
    )
    setSelectedArtist((prev) =>
      prev && prev._id === artistId ? { ...prev, ...changes } : prev
    )
  }

  const closeArtworkDetails = () => {
    setSelectedArtwork(null)
    setArtworkDetailsLoading(false)
  }

  const closeArtistDetails = () => {
    setSelectedArtist(null)
    setSelectedRelatedArtwork(null)
    setArtistDetailsLoading(false)
    setRelatedLoading(false)
    setRelatedDetailsLoading(false)
    setRelatedArtwork([])
    setRelatedCarouselPage(0)
  }

  const openArtworkDetails = async (item: ArtworkSummary) => {
    closeArtistDetails()
    setSelectedArtwork(item)
    setArtworkDetailsLoading(true)

    try {
      const response = await fetch(`/api/artwork/${item._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const detailedArtwork = (await response.json()) as ArtworkSummary
      updateArtworkState(item._id, detailedArtwork)
      setSelectedArtwork(detailedArtwork)
    } catch {
      setSelectedArtwork(item)
    } finally {
      setArtworkDetailsLoading(false)
    }
  }

  const openArtistDetails = async (artist: Artist) => {
    closeArtworkDetails()
    setSelectedArtist(artist)
    setSelectedRelatedArtwork(null)
    setArtistDetailsLoading(true)
    setRelatedLoading(true)
    setRelatedDetailsLoading(false)
    setRelatedArtwork([])
    setRelatedCarouselPage(0)

    let detailedArtist: Artist = artist

    try {
      const response = await fetch(`/api/artists/${artist._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      detailedArtist = (await response.json()) as Artist
      updateArtistState(artist._id, detailedArtist)
      setSelectedArtist(detailedArtist)
    } catch {
      setSelectedArtist(artist)
    } finally {
      setArtistDetailsLoading(false)
    }

    try {
      const response = await fetch(`/api/artwork?limit=${RELATED_ARTWORK_LIMIT}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const artworkData = (await response.json()) as ArtworkSummary[]
      const artistName = String(detailedArtist.DisplayName || '').trim().toLowerCase()
      const constituentId = Number(detailedArtist.ConstituentID)
      const hasConstituent = Number.isFinite(constituentId)

      const matchingArtwork = artworkData
        .filter((item) => {
          const byConstituent =
            hasConstituent &&
            hasMatchingConstituent(item.ConstituentID, constituentId)
          const byName = hasMatchingArtistName(item.Artist, artistName)
          return byConstituent || byName
        })
        .sort((a, b) => Number(b.Likes ?? 0) - Number(a.Likes ?? 0))

      setRelatedArtwork(matchingArtwork)
    } catch {
      setRelatedArtwork([])
    } finally {
      setRelatedLoading(false)
    }
  }

  const openRelatedArtworkDetails = async (item: ArtworkSummary) => {
    setSelectedRelatedArtwork(item)
    setRelatedDetailsLoading(true)

    try {
      const response = await fetch(`/api/artwork/${item._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const detailedArtwork = (await response.json()) as ArtworkSummary
      updateArtworkState(item._id, detailedArtwork)
      setSelectedRelatedArtwork(detailedArtwork)
    } catch {
      setSelectedRelatedArtwork(item)
    } finally {
      setRelatedDetailsLoading(false)
    }
  }

  const goBackToArtistDetails = () => {
    setSelectedRelatedArtwork(null)
    setRelatedDetailsLoading(false)
  }

  const handleArtworkLike = async (
    event: MouseEvent<HTMLButtonElement>,
    item: ArtworkSummary
  ) => {
    event.stopPropagation()

    const isCurrentlyLiked = likedArtworkIds.has(item._id)
    const currentLikes = Math.max(0, Number(item.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))

    setLikedArtworkIds((prev) => {
      const next = new Set(prev)
      if (isCurrentlyLiked) {
        next.delete(item._id)
      } else {
        next.add(item._id)
      }
      return next
    })

    updateArtworkState(item._id, { Likes: nextLikes })

    try {
      const response = await fetch(`/api/artwork/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Likes: nextLikes }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const updatedArtwork = (await response.json()) as ArtworkSummary
      updateArtworkState(item._id, updatedArtwork)
    } catch {
      setLikedArtworkIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlyLiked) {
          next.add(item._id)
        } else {
          next.delete(item._id)
        }
        return next
      })
      updateArtworkState(item._id, { Likes: currentLikes })
    }
  }

  const handleArtistLike = async (
    event: MouseEvent<HTMLButtonElement>,
    artist: Artist
  ) => {
    event.stopPropagation()

    const isCurrentlyLiked = likedArtistIds.has(artist._id)
    const currentLikes = Math.max(0, Number(artist.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))

    setLikedArtistIds((prev) => {
      const next = new Set(prev)
      if (isCurrentlyLiked) {
        next.delete(artist._id)
      } else {
        next.add(artist._id)
      }
      return next
    })

    updateArtistState(artist._id, { Likes: nextLikes })

    try {
      const response = await fetch(`/api/artists/${artist._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Likes: nextLikes }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const updatedArtist = (await response.json()) as Artist
      updateArtistState(artist._id, updatedArtist)
    } catch {
      setLikedArtistIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlyLiked) {
          next.add(artist._id)
        } else {
          next.delete(artist._id)
        }
        return next
      })
      updateArtistState(artist._id, { Likes: currentLikes })
    }
  }

  const handleRelatedArtworkLike = async (
    event: MouseEvent<HTMLButtonElement>,
    item: ArtworkSummary
  ) => {
    event.stopPropagation()

    const isCurrentlyLiked = likedRelatedArtworkIds.has(item._id)
    const currentLikes = Math.max(0, Number(item.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))

    setLikedRelatedArtworkIds((prev) => {
      const next = new Set(prev)
      if (isCurrentlyLiked) {
        next.delete(item._id)
      } else {
        next.add(item._id)
      }
      return next
    })

    updateArtworkState(item._id, { Likes: nextLikes })

    try {
      const response = await fetch(`/api/artwork/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Likes: nextLikes }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const updatedArtwork = (await response.json()) as ArtworkSummary
      updateArtworkState(item._id, updatedArtwork)
    } catch {
      setLikedRelatedArtworkIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlyLiked) {
          next.add(item._id)
        } else {
          next.delete(item._id)
        }
        return next
      })
      updateArtworkState(item._id, { Likes: currentLikes })
    }
  }

  const relatedCarouselMaxPage = useMemo(() => {
    if (relatedArtwork.length === 0) {
      return 0
    }

    return Math.ceil(relatedArtwork.length / CAROUSEL_PAGE_SIZE) - 1
  }, [relatedArtwork.length])

  const relatedCarouselItems = useMemo(() => {
    const start = relatedCarouselPage * CAROUSEL_PAGE_SIZE
    return relatedArtwork.slice(start, start + CAROUSEL_PAGE_SIZE)
  }, [relatedArtwork, relatedCarouselPage])

  const extraArtistFields =
    selectedArtist === null
      ? []
      : Object.entries(selectedArtist).filter(([key, value]) => {
          if (ARTIST_HIDDEN_FIELDS.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })

  const extraArtworkFields =
    selectedArtwork === null
      ? []
      : Object.entries(selectedArtwork).filter(([key, value]) => {
          if (ARTWORK_HIDDEN_FIELDS.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })

  const extraRelatedArtworkFields =
    selectedRelatedArtwork === null
      ? []
      : Object.entries(selectedRelatedArtwork).filter(([key, value]) => {
          if (ARTWORK_HIDDEN_FIELDS.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })

  const isSelectedArtworkLiked = selectedArtwork
    ? likedArtworkIds.has(selectedArtwork._id)
    : false
  const isSelectedArtistLiked = selectedArtist
    ? likedArtistIds.has(selectedArtist._id)
    : false
  const isSelectedRelatedArtworkLiked = selectedRelatedArtwork
    ? likedRelatedArtworkIds.has(selectedRelatedArtwork._id)
    : false

  return (
    <section className="home-page">
      <section className="home-hero">
        <div className="home-hero-media">
          <img
            src={momaHeroImage}
            alt="Interior view of a MoMA gallery with visitors and installations"
            className="home-hero-image"
          />
        </div>
        <div className="home-hero-copy">
          <h1 className="page-title home-hero-title">Welcome to MoMA</h1>
          <p className="page-subtitle home-hero-text">
            Explore artists, artworks, and standout moments from the Museum of
            Modern Art through a clean browsing experience designed to feel like a
            gallery visit.
          </p>
          <div className="home-hero-actions">
            <a href="#/artwork" className="show-more-btn home-action-btn">
              Browse Artwork
            </a>
            <a href="#/artists" className="show-more-btn home-action-btn">
              Discover Artists
            </a>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <p className="home-section-kicker">Featured Works</p>
            <h2 className="page-title home-section-title">Artwork Highlights</h2>
            <p className="page-subtitle home-section-subtitle">
              A rotating-style preview of pieces currently living in the collection
              dataset.
            </p>
          </div>
          <div className="home-section-actions">
            <div className="home-carousel-controls">
              <button
                type="button"
                className="carousel-btn"
                onClick={() => scrollTrack(artworkTrackRef, 'prev')}
              >
                Prev
              </button>
              <button
                type="button"
                className="carousel-btn"
                onClick={() => scrollTrack(artworkTrackRef, 'next')}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="status-text">Loading artwork highlights...</p>
        ) : error ? (
          <p className="status-text">Error: {error}</p>
        ) : (
          <div className="home-carousel-track" ref={artworkTrackRef}>
            {artwork.map((item) => {
              const isLiked = likedArtworkIds.has(item._id)

              return (
                <article
                  className="card home-carousel-card"
                  key={item._id}
                  onClick={() => openArtworkDetails(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openArtworkDetails(item)
                    }
                  }}
                >
                  {item.ImageURL ? (
                    <img
                      src={item.ImageURL}
                      alt={item.Title || 'Artwork'}
                      className="card-image home-carousel-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="card-image card-image-empty home-carousel-image">
                      No image
                    </div>
                  )}
                  <h3 className="card-title">{item.Title || 'Untitled'}</h3>
                  <p className="card-meta">{getArtistLabel(item.Artist)}</p>
                  <p className="card-meta">{item.Date || 'Date unavailable'}</p>
                  <p className="card-likes">Likes: {item.Likes ?? 0}</p>
                  <button
                    type="button"
                    className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
                    onClick={(event) => handleArtworkLike(event, item)}
                    aria-label={`${isLiked ? 'Unlike' : 'Like'} ${
                      item.Title || 'artwork'
                    }`}
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    {isLiked ? '\u2665' : '\u2661'}
                  </button>
                </article>
              )
            })}
          </div>
        )}

        <div className="home-section-footer">
          <a href="#/artwork" className="show-more-btn home-section-btn">
            View All Artwork
          </a>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <p className="home-section-kicker">Featured Artists</p>
            <h2 className="page-title home-section-title">Artists to Explore</h2>
            <p className="page-subtitle home-section-subtitle">
              A quick way into the people behind the collection.
            </p>
          </div>
          <div className="home-section-actions">
            <div className="home-carousel-controls">
              <button
                type="button"
                className="carousel-btn"
                onClick={() => scrollTrack(artistTrackRef, 'prev')}
              >
                Prev
              </button>
              <button
                type="button"
                className="carousel-btn"
                onClick={() => scrollTrack(artistTrackRef, 'next')}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="status-text">Loading artists...</p>
        ) : error ? (
          <p className="status-text">Error: {error}</p>
        ) : (
          <div className="home-carousel-track" ref={artistTrackRef}>
            {artists.map((artist) => {
              const isLiked = likedArtistIds.has(artist._id)

              return (
                <article
                  className="card home-carousel-card home-artist-card"
                  key={artist._id}
                  onClick={() => openArtistDetails(artist)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openArtistDetails(artist)
                    }
                  }}
                >
                  <div className="home-artist-card-body">
                    <h3 className="card-title">
                      {artist.DisplayName || 'Unknown artist'}
                    </h3>
                    <p className="card-meta">{getArtistMeta(artist)}</p>
                    <p className="home-artist-bio">
                      {artist.ArtistBio?.trim() ||
                        'Biography unavailable in the current dataset.'}
                    </p>
                  </div>
                  <p className="card-likes">Likes: {artist.Likes ?? 0}</p>
                  <button
                    type="button"
                    className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
                    onClick={(event) => handleArtistLike(event, artist)}
                    aria-label={`${isLiked ? 'Unlike' : 'Like'} ${
                      artist.DisplayName || 'artist'
                    }`}
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    {isLiked ? '\u2665' : '\u2661'}
                  </button>
                </article>
              )
            })}
          </div>
        )}

        <div className="home-section-footer">
          <a href="#/artists" className="show-more-btn home-section-btn">
            View All Artists
          </a>
        </div>
      </section>

      <section className="home-about-teaser">
        <div className="home-about-copy">
          <p className="home-section-kicker">About The Museum</p>
          <h2 className="page-title home-section-title">
            A platform built around the collection.
          </h2>
          <p className="page-subtitle home-section-subtitle">
            This project brings MoMA-inspired browsing together in one place,
            combining collection discovery, artist context, and personal account
            features in a clean interface.
          </p>
          <p className="home-about-text">
            From major works to artist biographies, the goal is to make the museum
            feel less like a database and more like a guided visit through modern
            and contemporary art.
          </p>
        </div>
        <div className="home-about-actions">
          <a href="#/about" className="show-more-btn home-section-btn">
            Read More
          </a>
        </div>
      </section>

      <DetailsModal
        title={selectedArtwork?.Title || 'Artwork'}
        item={selectedArtwork}
        loading={artworkDetailsLoading}
        onClose={closeArtworkDetails}
      >
        {selectedArtwork && (
          <div className="modal-content artwork-modal-layout">
            <div className="artwork-main-grid">
              <section className="modal-section modal-section-with-like">
                <h3 className="modal-section-title">Artwork Information</h3>
                <div className="modal-info-grid">
                  <InfoRow label="Title" value={selectedArtwork.Title} />
                  <InfoRow
                    label="Artist"
                    value={getArtistLabel(selectedArtwork.Artist)}
                  />
                  <InfoRow label="Date" value={selectedArtwork.Date} />
                  <InfoRow label="Medium" value={selectedArtwork.Medium} />
                  <InfoRow
                    label="Classification"
                    value={selectedArtwork.Classification}
                  />
                  <InfoRow label="Department" value={selectedArtwork.Department} />
                  <InfoRow
                    label="Accession Number"
                    value={selectedArtwork.AccessionNumber}
                  />
                  <InfoRow label="Object ID" value={selectedArtwork.ObjectID} />
                  <InfoRow label="Likes" value={selectedArtwork.Likes ?? 0} />
                </div>
                <button
                  type="button"
                  className={`modal-section-like-btn ${
                    isSelectedArtworkLiked ? 'liked' : ''
                  }`}
                  onClick={(event) => handleArtworkLike(event, selectedArtwork)}
                  aria-label={`${
                    isSelectedArtworkLiked ? 'Unlike' : 'Like'
                  } ${selectedArtwork.Title || 'artwork'}`}
                  title={isSelectedArtworkLiked ? 'Unlike' : 'Like'}
                >
                  {isSelectedArtworkLiked ? '\u2665' : '\u2661'}
                </button>
              </section>

              <section className="modal-section artwork-image-section">
                <h3 className="modal-section-title">Artwork Image</h3>
                {selectedArtwork.ImageURL ? (
                  <img
                    src={selectedArtwork.ImageURL}
                    alt={selectedArtwork.Title || 'Artwork image'}
                    className="modal-artwork-image"
                  />
                ) : (
                  <div className="modal-artwork-image-empty">No image available</div>
                )}
              </section>
            </div>

            <section className="modal-section">
              <h3 className="modal-section-title">Dimensions & Gallery Status</h3>
              <div className="modal-info-grid">
                <InfoRow label="Dimensions" value={selectedArtwork.Dimensions} />
                <InfoRow
                  label="Height (cm)"
                  value={selectedArtwork['Height (cm)']}
                />
                <InfoRow
                  label="Width (cm)"
                  value={selectedArtwork['Width (cm)']}
                />
                <InfoRow
                  label="Depth (cm)"
                  value={selectedArtwork['Depth (cm)']}
                />
                <InfoRow label="On View" value={selectedArtwork.OnView} />
                <InfoRow
                  label="Date Acquired"
                  value={selectedArtwork.DateAcquired}
                />
                <InfoRow label="Cataloged" value={selectedArtwork.Cataloged} />
              </div>
              <p className="modal-bio">
                <span className="modal-info-label">Credit Line:</span>{' '}
                {asDisplayValue(selectedArtwork.CreditLine)}
              </p>
            </section>

            <section className="modal-section">
              <h3 className="modal-section-title">Links</h3>
              <div className="modal-info-grid">
                <div className="modal-info-row">
                  <span className="modal-info-label">Artwork URL</span>
                  <span className="modal-info-value">
                    {typeof selectedArtwork.URL === 'string' && selectedArtwork.URL ? (
                      <a
                        href={selectedArtwork.URL}
                        target="_blank"
                        rel="noreferrer"
                        className="modal-link"
                      >
                        Open artwork link
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Image URL</span>
                  <span className="modal-info-value">
                    {typeof selectedArtwork.ImageURL === 'string' &&
                    selectedArtwork.ImageURL ? (
                      <a
                        href={selectedArtwork.ImageURL}
                        target="_blank"
                        rel="noreferrer"
                        className="modal-link"
                      >
                        Open image link
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
              </div>
            </section>

            {extraArtworkFields.length > 0 && (
              <section className="modal-section">
                <h3 className="modal-section-title">Additional Details</h3>
                <div className="details-list">
                  {extraArtworkFields.map(([key, value]) => (
                    <div className="details-row" key={key}>
                      <div className="details-key">{key}</div>
                      <div className="details-value">{asDisplayValue(value)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </DetailsModal>

      <DetailsModal
        title={selectedRelatedArtwork?.Title || selectedArtist?.DisplayName || 'Artist'}
        item={selectedRelatedArtwork || selectedArtist}
        loading={selectedRelatedArtwork ? relatedDetailsLoading : artistDetailsLoading}
        onBack={selectedRelatedArtwork ? goBackToArtistDetails : undefined}
        backLabel="Back to artist"
        onClose={closeArtistDetails}
      >
        {selectedRelatedArtwork ? (
          <div className="modal-content artwork-modal-layout">
            <div className="artwork-main-grid">
              <section className="modal-section modal-section-with-like">
                <h3 className="modal-section-title">Artwork Information</h3>
                <div className="modal-info-grid">
                  <InfoRow label="Title" value={selectedRelatedArtwork.Title} />
                  <InfoRow
                    label="Artist"
                    value={getArtistLabel(selectedRelatedArtwork.Artist)}
                  />
                  <InfoRow label="Date" value={selectedRelatedArtwork.Date} />
                  <InfoRow label="Medium" value={selectedRelatedArtwork.Medium} />
                  <InfoRow
                    label="Classification"
                    value={selectedRelatedArtwork.Classification}
                  />
                  <InfoRow
                    label="Department"
                    value={selectedRelatedArtwork.Department}
                  />
                  <InfoRow
                    label="Accession Number"
                    value={selectedRelatedArtwork.AccessionNumber}
                  />
                  <InfoRow
                    label="Object ID"
                    value={selectedRelatedArtwork.ObjectID}
                  />
                  <InfoRow
                    label="Likes"
                    value={selectedRelatedArtwork.Likes ?? 0}
                  />
                </div>
                <button
                  type="button"
                  className={`modal-section-like-btn ${
                    isSelectedRelatedArtworkLiked ? 'liked' : ''
                  }`}
                  onClick={(event) =>
                    handleRelatedArtworkLike(event, selectedRelatedArtwork)
                  }
                  aria-label={`${
                    isSelectedRelatedArtworkLiked ? 'Unlike' : 'Like'
                  } ${selectedRelatedArtwork.Title || 'artwork'}`}
                  title={isSelectedRelatedArtworkLiked ? 'Unlike' : 'Like'}
                >
                  {isSelectedRelatedArtworkLiked ? '\u2665' : '\u2661'}
                </button>
              </section>

              <section className="modal-section artwork-image-section">
                <h3 className="modal-section-title">Artwork Image</h3>
                {selectedRelatedArtwork.ImageURL ? (
                  <img
                    src={selectedRelatedArtwork.ImageURL}
                    alt={selectedRelatedArtwork.Title || 'Artwork image'}
                    className="modal-artwork-image"
                  />
                ) : (
                  <div className="modal-artwork-image-empty">No image available</div>
                )}
              </section>
            </div>

            <section className="modal-section">
              <h3 className="modal-section-title">Dimensions & Gallery Status</h3>
              <div className="modal-info-grid">
                <InfoRow
                  label="Dimensions"
                  value={selectedRelatedArtwork.Dimensions}
                />
                <InfoRow
                  label="Height (cm)"
                  value={selectedRelatedArtwork['Height (cm)']}
                />
                <InfoRow
                  label="Width (cm)"
                  value={selectedRelatedArtwork['Width (cm)']}
                />
                <InfoRow
                  label="Depth (cm)"
                  value={selectedRelatedArtwork['Depth (cm)']}
                />
                <InfoRow label="On View" value={selectedRelatedArtwork.OnView} />
                <InfoRow
                  label="Date Acquired"
                  value={selectedRelatedArtwork.DateAcquired}
                />
                <InfoRow
                  label="Cataloged"
                  value={selectedRelatedArtwork.Cataloged}
                />
              </div>
              <p className="modal-bio">
                <span className="modal-info-label">Credit Line:</span>{' '}
                {asDisplayValue(selectedRelatedArtwork.CreditLine)}
              </p>
            </section>

            <section className="modal-section">
              <h3 className="modal-section-title">Links</h3>
              <div className="modal-info-grid">
                <div className="modal-info-row">
                  <span className="modal-info-label">Artwork URL</span>
                  <span className="modal-info-value">
                    {typeof selectedRelatedArtwork.URL === 'string' &&
                    selectedRelatedArtwork.URL ? (
                      <a
                        href={selectedRelatedArtwork.URL}
                        target="_blank"
                        rel="noreferrer"
                        className="modal-link"
                      >
                        Open artwork link
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Image URL</span>
                  <span className="modal-info-value">
                    {typeof selectedRelatedArtwork.ImageURL === 'string' &&
                    selectedRelatedArtwork.ImageURL ? (
                      <a
                        href={selectedRelatedArtwork.ImageURL}
                        target="_blank"
                        rel="noreferrer"
                        className="modal-link"
                      >
                        Open image link
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
              </div>
            </section>

            {extraRelatedArtworkFields.length > 0 && (
              <section className="modal-section">
                <h3 className="modal-section-title">Additional Details</h3>
                <div className="details-list">
                  {extraRelatedArtworkFields.map(([key, value]) => (
                    <div className="details-row" key={key}>
                      <div className="details-key">{key}</div>
                      <div className="details-value">{asDisplayValue(value)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          selectedArtist && (
            <div className="modal-content">
              <section className="modal-section modal-section-with-like">
                <h3 className="modal-section-title">Artist Information</h3>
                <div className="modal-info-grid">
                  <InfoRow label="Name" value={selectedArtist.DisplayName} />
                  <InfoRow label="Nationality" value={selectedArtist.Nationality} />
                  <InfoRow label="Gender" value={selectedArtist.Gender} />
                  <InfoRow
                    label="Constituent ID"
                    value={selectedArtist.ConstituentID}
                  />
                  <InfoRow
                    label="Life Span"
                    value={`${asDisplayValue(selectedArtist.BeginDate)} - ${asDisplayValue(
                      selectedArtist.EndDate
                    )}`}
                  />
                  <InfoRow label="Likes" value={selectedArtist.Likes ?? 0} />
                </div>
                <button
                  type="button"
                  className={`modal-section-like-btn ${
                    isSelectedArtistLiked ? 'liked' : ''
                  }`}
                  onClick={(event) => handleArtistLike(event, selectedArtist)}
                  aria-label={`${
                    isSelectedArtistLiked ? 'Unlike' : 'Like'
                  } ${selectedArtist.DisplayName || 'artist'}`}
                  title={isSelectedArtistLiked ? 'Unlike' : 'Like'}
                >
                  {isSelectedArtistLiked ? '\u2665' : '\u2661'}
                </button>
                <p className="modal-bio">
                  <span className="modal-info-label">Biography:</span>{' '}
                  {asDisplayValue(selectedArtist.ArtistBio)}
                </p>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Identifiers</h3>
                <div className="modal-info-grid">
                  <InfoRow label="ULAN" value={selectedArtist.ULAN} />
                  <InfoRow label="Wiki QID" value={selectedArtist['Wiki QID']} />
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Artwork By This Artist</h3>
                {relatedLoading ? (
                  <p className="modal-status">Loading artwork for this artist...</p>
                ) : relatedArtwork.length === 0 ? (
                  <p className="modal-status">
                    No related artwork found in the current dataset.
                  </p>
                ) : (
                  <div className="carousel-wrapper">
                    <div className="carousel-controls">
                      <button
                        type="button"
                        className="carousel-btn"
                        onClick={() =>
                          setRelatedCarouselPage((prev) => Math.max(0, prev - 1))
                        }
                        disabled={relatedCarouselPage === 0}
                      >
                        Prev
                      </button>
                      <span className="carousel-count">
                        {relatedCarouselPage + 1} / {relatedCarouselMaxPage + 1}
                      </span>
                      <button
                        type="button"
                        className="carousel-btn"
                        onClick={() =>
                          setRelatedCarouselPage((prev) =>
                            Math.min(relatedCarouselMaxPage, prev + 1)
                          )
                        }
                        disabled={relatedCarouselPage >= relatedCarouselMaxPage}
                      >
                        Next
                      </button>
                    </div>
                    <div className="carousel-grid">
                      {relatedCarouselItems.map((item) => {
                        const isLiked = likedRelatedArtworkIds.has(item._id)

                        return (
                          <article
                            className="card"
                            key={item._id}
                            onClick={() => openRelatedArtworkDetails(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                openRelatedArtworkDetails(item)
                              }
                            }}
                          >
                            {item.ImageURL ? (
                              <img
                                src={item.ImageURL}
                                alt={item.Title || 'Artwork'}
                                className="card-image"
                                loading="lazy"
                              />
                            ) : (
                              <div className="card-image card-image-empty">
                                No image
                              </div>
                            )}
                            <h4 className="card-title">{item.Title || 'Untitled'}</h4>
                            <p className="card-meta">{getArtistLabel(item.Artist)}</p>
                            <p className="card-meta">{item.Date || 'Unknown date'}</p>
                            <p className="card-likes">Likes: {item.Likes ?? 0}</p>
                            <button
                              type="button"
                              className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
                              onClick={(event) =>
                                handleRelatedArtworkLike(event, item)
                              }
                              aria-label={`${isLiked ? 'Unlike' : 'Like'} ${
                                item.Title || 'artwork'
                              }`}
                              title={isLiked ? 'Unlike' : 'Like'}
                            >
                              {isLiked ? '\u2665' : '\u2661'}
                            </button>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>

              {extraArtistFields.length > 0 && (
                <section className="modal-section">
                  <h3 className="modal-section-title">Additional Details</h3>
                  <div className="details-list">
                    {extraArtistFields.map(([key, value]) => (
                      <div className="details-row" key={key}>
                        <div className="details-key">{key}</div>
                        <div className="details-value">{asDisplayValue(value)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        )}
      </DetailsModal>
    </section>
  )
}

export default HomePage
