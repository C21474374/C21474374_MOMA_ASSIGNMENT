import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import DetailsModal from '../components/DetailsModal'

const PAGE_SIZE = 50
const CAROUSEL_PAGE_SIZE = 3

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

function ArtistInfoRow({
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

function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [likedArtistIds, setLikedArtistIds] = useState<Set<string>>(new Set())
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [relatedArtwork, setRelatedArtwork] = useState<ArtworkSummary[]>([])
  const [selectedRelatedArtwork, setSelectedRelatedArtwork] =
    useState<ArtworkSummary | null>(null)
  const [relatedDetailsLoading, setRelatedDetailsLoading] = useState(false)
  const [likedRelatedArtworkIds, setLikedRelatedArtworkIds] = useState<Set<string>>(
    new Set()
  )
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [carouselPage, setCarouselPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadArtists = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/artists?limit=200')
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = (await response.json()) as Artist[]
        if (isMounted) {
          setArtists(data)
          setVisibleCount(PAGE_SIZE)
          setError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load artists'
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadArtists()

    return () => {
      isMounted = false
    }
  }, [])

  const visibleArtists = artists.slice(0, visibleCount)
  const canShowMore = visibleCount < artists.length

  const closeDetails = () => {
    setSelectedArtist(null)
    setSelectedRelatedArtwork(null)
    setDetailsLoading(false)
    setRelatedLoading(false)
    setRelatedDetailsLoading(false)
    setRelatedArtwork([])
    setCarouselPage(0)
  }

  const openArtistDetails = async (artist: Artist) => {
    setSelectedArtist(artist)
    setSelectedRelatedArtwork(null)
    setDetailsLoading(true)
    setRelatedLoading(true)
    setRelatedDetailsLoading(false)
    setRelatedArtwork([])
    setCarouselPage(0)

    let detailedArtist: Artist = artist

    try {
      const response = await fetch(`/api/artists/${artist._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      detailedArtist = (await response.json()) as Artist
      setSelectedArtist(detailedArtist)
    } catch {
      setSelectedArtist(artist)
    } finally {
      setDetailsLoading(false)
    }

    try {
      const response = await fetch('/api/artwork?limit=200')
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const artwork = (await response.json()) as ArtworkSummary[]
      const artistName = String(detailedArtist.DisplayName || '').trim().toLowerCase()
      const constituentId = Number(detailedArtist.ConstituentID)
      const hasConstituent = Number.isFinite(constituentId)

      const matchingArtwork = artwork
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
      setSelectedRelatedArtwork(detailedArtwork)
      setRelatedArtwork((prev) =>
        prev.map((art) => (art._id === item._id ? detailedArtwork : art))
      )
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

  const handleLike = async (event: MouseEvent<HTMLButtonElement>, artist: Artist) => {
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

    setArtists((prev) =>
      prev.map((item) =>
        item._id === artist._id ? { ...item, Likes: nextLikes } : item
      )
    )
    setSelectedArtist((prev) =>
      prev && prev._id === artist._id ? { ...prev, Likes: nextLikes } : prev
    )

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
      setArtists((prev) =>
        prev.map((item) => (item._id === artist._id ? updatedArtist : item))
      )
      setSelectedArtist((prev) =>
        prev && prev._id === artist._id ? updatedArtist : prev
      )
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
      setArtists((prev) =>
        prev.map((item) =>
          item._id === artist._id ? { ...item, Likes: currentLikes } : item
        )
      )
      setSelectedArtist((prev) =>
        prev && prev._id === artist._id ? { ...prev, Likes: currentLikes } : prev
      )
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

    setRelatedArtwork((prev) =>
      prev.map((art) => (art._id === item._id ? { ...art, Likes: nextLikes } : art))
    )
    setSelectedRelatedArtwork((prev) =>
      prev && prev._id === item._id ? { ...prev, Likes: nextLikes } : prev
    )

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
      setRelatedArtwork((prev) =>
        prev.map((art) => (art._id === item._id ? updatedArtwork : art))
      )
      setSelectedRelatedArtwork((prev) =>
        prev && prev._id === item._id ? updatedArtwork : prev
      )
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
      setRelatedArtwork((prev) =>
        prev.map((art) =>
          art._id === item._id ? { ...art, Likes: currentLikes } : art
        )
      )
      setSelectedRelatedArtwork((prev) =>
        prev && prev._id === item._id ? { ...prev, Likes: currentLikes } : prev
      )
    }
  }

  const carouselMaxPage = useMemo(() => {
    if (relatedArtwork.length === 0) {
      return 0
    }
    return Math.ceil(relatedArtwork.length / CAROUSEL_PAGE_SIZE) - 1
  }, [relatedArtwork.length])

  const carouselItems = useMemo(() => {
    const start = carouselPage * CAROUSEL_PAGE_SIZE
    return relatedArtwork.slice(start, start + CAROUSEL_PAGE_SIZE)
  }, [carouselPage, relatedArtwork])

  if (loading) {
    return <p className="status-text">Loading artists...</p>
  }

  if (error) {
    return <p className="status-text">Error: {error}</p>
  }

  const extraArtistFields =
    selectedArtist === null
      ? []
      : Object.entries(selectedArtist).filter(([key, value]) => {
          const hiddenKeys = new Set([
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

          if (hiddenKeys.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })

  const extraRelatedArtworkFields =
    selectedRelatedArtwork === null
      ? []
      : Object.entries(selectedRelatedArtwork).filter(([key, value]) => {
          const hiddenKeys = new Set([
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

          if (hiddenKeys.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })
  const isSelectedArtistLiked = selectedArtist
    ? likedArtistIds.has(selectedArtist._id)
    : false
  const isSelectedRelatedArtworkLiked = selectedRelatedArtwork
    ? likedRelatedArtworkIds.has(selectedRelatedArtwork._id)
    : false

  return (
    <section className="collection-page">
      <h1 className="page-title">Artists</h1>
      <p className="page-subtitle">
        Showing {visibleArtists.length} out of {artists.length} artists
      </p>
      <div className="card-grid">
        {visibleArtists.map((artist) => {
          const isLiked = likedArtistIds.has(artist._id)
          const bioText =
            typeof artist.ArtistBio === 'string' ? artist.ArtistBio.trim() : ''
          const nationalityAndDates = `${artist.Nationality || 'Unknown nationality'}${
            artist.BeginDate ? `, ${artist.BeginDate}` : ''
          }${artist.EndDate ? `-${artist.EndDate}` : ''}`

          return (
          <article
            className="card"
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
            <h2 className="card-title">{artist.DisplayName || 'Unknown Artist'}</h2>
            <p className="card-meta">{bioText || nationalityAndDates}</p>
            <p className="card-likes">Likes: {artist.Likes ?? 0}</p>
            <button
              type="button"
              className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
              onClick={(event) => handleLike(event, artist)}
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
      {canShowMore && (
        <button
          type="button"
          className="show-more-btn"
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
        >
          Show more results +
        </button>
      )}
      <DetailsModal
        title={selectedRelatedArtwork?.Title || selectedArtist?.DisplayName || 'Artist'}
        item={selectedRelatedArtwork || selectedArtist}
        loading={selectedRelatedArtwork ? relatedDetailsLoading : detailsLoading}
        onBack={selectedRelatedArtwork ? goBackToArtistDetails : undefined}
        backLabel="Back to artist"
        onClose={closeDetails}
      >
        {selectedRelatedArtwork ? (
          <div className="modal-content artwork-modal-layout">
            <div className="artwork-main-grid">
              <section className="modal-section modal-section-with-like">
                <h3 className="modal-section-title">Artwork Information</h3>
                <div className="modal-info-grid">
                  <ArtistInfoRow label="Title" value={selectedRelatedArtwork.Title} />
                  <ArtistInfoRow
                    label="Artist"
                    value={getArtistLabel(selectedRelatedArtwork.Artist)}
                  />
                  <ArtistInfoRow label="Date" value={selectedRelatedArtwork.Date} />
                  <ArtistInfoRow label="Medium" value={selectedRelatedArtwork.Medium} />
                  <ArtistInfoRow
                    label="Classification"
                    value={selectedRelatedArtwork.Classification}
                  />
                  <ArtistInfoRow
                    label="Department"
                    value={selectedRelatedArtwork.Department}
                  />
                  <ArtistInfoRow
                    label="Accession Number"
                    value={selectedRelatedArtwork.AccessionNumber}
                  />
                  <ArtistInfoRow
                    label="Object ID"
                    value={selectedRelatedArtwork.ObjectID}
                  />
                  <ArtistInfoRow
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
                <ArtistInfoRow
                  label="Dimensions"
                  value={selectedRelatedArtwork.Dimensions}
                />
                <ArtistInfoRow
                  label="Height (cm)"
                  value={selectedRelatedArtwork['Height (cm)']}
                />
                <ArtistInfoRow
                  label="Width (cm)"
                  value={selectedRelatedArtwork['Width (cm)']}
                />
                <ArtistInfoRow
                  label="Depth (cm)"
                  value={selectedRelatedArtwork['Depth (cm)']}
                />
                <ArtistInfoRow label="On View" value={selectedRelatedArtwork.OnView} />
                <ArtistInfoRow
                  label="Date Acquired"
                  value={selectedRelatedArtwork.DateAcquired}
                />
                <ArtistInfoRow
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
                <ArtistInfoRow label="Name" value={selectedArtist.DisplayName} />
                <ArtistInfoRow
                  label="Nationality"
                  value={selectedArtist.Nationality}
                />
                <ArtistInfoRow label="Gender" value={selectedArtist.Gender} />
                <ArtistInfoRow
                  label="Constituent ID"
                  value={selectedArtist.ConstituentID}
                />
                <ArtistInfoRow
                  label="Life Span"
                  value={`${asDisplayValue(selectedArtist.BeginDate)} - ${asDisplayValue(
                    selectedArtist.EndDate
                  )}`}
                />
                <ArtistInfoRow label="Likes" value={selectedArtist.Likes ?? 0} />
              </div>
              <button
                type="button"
                className={`modal-section-like-btn ${
                  isSelectedArtistLiked ? 'liked' : ''
                }`}
                onClick={(event) => handleLike(event, selectedArtist)}
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
                <ArtistInfoRow label="ULAN" value={selectedArtist.ULAN} />
                <ArtistInfoRow label="Wiki QID" value={selectedArtist['Wiki QID']} />
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
                      onClick={() => setCarouselPage((prev) => Math.max(0, prev - 1))}
                      disabled={carouselPage === 0}
                    >
                      Prev
                    </button>
                    <span className="carousel-count">
                      {carouselPage + 1} / {carouselMaxPage + 1}
                    </span>
                    <button
                      type="button"
                      className="carousel-btn"
                      onClick={() =>
                        setCarouselPage((prev) => Math.min(carouselMaxPage, prev + 1))
                      }
                      disabled={carouselPage >= carouselMaxPage}
                    >
                      Next
                    </button>
                  </div>
                  <div className="carousel-grid">
                    {carouselItems.map((item) => {
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
                          onClick={(event) => handleRelatedArtworkLike(event, item)}
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

export default ArtistsPage
