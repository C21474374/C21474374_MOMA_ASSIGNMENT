import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import DetailsModal from '../components/DetailsModal'

const PAGE_SIZE = 50

type Artwork = {
  _id: string
  Title?: string
  Artist?: string[] | string
  Date?: string
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
  ImageURL?: string
  OnView?: string
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

function getArtistLabel(artist: Artwork['Artist']) {
  if (Array.isArray(artist)) {
    return artist.filter(Boolean).join(', ')
  }
  if (typeof artist === 'string') {
    return artist
  }
  return 'Unknown artist'
}

function ArtworkInfoRow({
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

function ArtworkPage() {
  const [artwork, setArtwork] = useState<Artwork[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [likedArtworkIds, setLikedArtworkIds] = useState<Set<string>>(new Set())
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadArtwork = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/artwork?limit=200')
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = (await response.json()) as Artwork[]
        if (isMounted) {
          setArtwork(data)
          setVisibleCount(PAGE_SIZE)
          setError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load artwork'
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadArtwork()

    return () => {
      isMounted = false
    }
  }, [])

  const visibleArtwork = artwork.slice(0, visibleCount)
  const canShowMore = visibleCount < artwork.length

  const closeDetails = () => {
    setSelectedArtwork(null)
    setDetailsLoading(false)
  }

  const openArtworkDetails = async (item: Artwork) => {
    setSelectedArtwork(item)
    setDetailsLoading(true)

    try {
      const response = await fetch(`/api/artwork/${item._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const detailedArtwork = (await response.json()) as Artwork
      setSelectedArtwork(detailedArtwork)
    } catch {
      setSelectedArtwork(item)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleLike = async (event: MouseEvent<HTMLButtonElement>, item: Artwork) => {
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

    setArtwork((prev) =>
      prev.map((art) => (art._id === item._id ? { ...art, Likes: nextLikes } : art))
    )
    setSelectedArtwork((prev) =>
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

      const updatedArtwork = (await response.json()) as Artwork
      setArtwork((prev) =>
        prev.map((art) => (art._id === item._id ? updatedArtwork : art))
      )
      setSelectedArtwork((prev) =>
        prev && prev._id === item._id ? updatedArtwork : prev
      )
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
      setArtwork((prev) =>
        prev.map((art) => (art._id === item._id ? { ...art, Likes: currentLikes } : art))
      )
      setSelectedArtwork((prev) =>
        prev && prev._id === item._id ? { ...prev, Likes: currentLikes } : prev
      )
    }
  }

  if (loading) {
    return <p className="status-text">Loading artwork...</p>
  }

  if (error) {
    return <p className="status-text">Error: {error}</p>
  }

  const extraArtworkFields =
    selectedArtwork === null
      ? []
      : Object.entries(selectedArtwork).filter(([key, value]) => {
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
  const isSelectedArtworkLiked = selectedArtwork
    ? likedArtworkIds.has(selectedArtwork._id)
    : false

  return (
    <section className="collection-page">
      <h1 className="page-title">Artwork</h1>
      <p className="page-subtitle">
        Showing {visibleArtwork.length} out of {artwork.length} artworks
      </p>
      <div className="card-grid">
        {visibleArtwork.map((item) => {
          const isLiked = likedArtworkIds.has(item._id)

          return (
          <article
            className="card"
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
                className="card-image"
                loading="lazy"
              />
            ) : (
              <div className="card-image card-image-empty">No image</div>
            )}
            <h2 className="card-title">{item.Title || 'Untitled'}</h2>
            <p className="card-meta">{getArtistLabel(item.Artist)}</p>
            <p className="card-meta">{item.Date || 'Unknown date'}</p>
            <p className="card-likes">Likes: {item.Likes ?? 0}</p>
            <button
              type="button"
              className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
              onClick={(event) => handleLike(event, item)}
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
        title={selectedArtwork?.Title || 'Artwork'}
        item={selectedArtwork}
        loading={detailsLoading}
        onClose={closeDetails}
      >
        {selectedArtwork && (
          <div className="modal-content artwork-modal-layout">
            <div className="artwork-main-grid">
              <section className="modal-section modal-section-with-like">
                <h3 className="modal-section-title">Artwork Information</h3>
                <div className="modal-info-grid">
                  <ArtworkInfoRow label="Title" value={selectedArtwork.Title} />
                  <ArtworkInfoRow
                    label="Artist"
                    value={getArtistLabel(selectedArtwork.Artist)}
                  />
                  <ArtworkInfoRow label="Date" value={selectedArtwork.Date} />
                  <ArtworkInfoRow label="Medium" value={selectedArtwork.Medium} />
                  <ArtworkInfoRow
                    label="Classification"
                    value={selectedArtwork.Classification}
                  />
                  <ArtworkInfoRow
                    label="Department"
                    value={selectedArtwork.Department}
                  />
                  <ArtworkInfoRow
                    label="Accession Number"
                    value={selectedArtwork.AccessionNumber}
                  />
                  <ArtworkInfoRow label="Object ID" value={selectedArtwork.ObjectID} />
                  <ArtworkInfoRow label="Likes" value={selectedArtwork.Likes ?? 0} />
                </div>
                <button
                  type="button"
                  className={`modal-section-like-btn ${
                    isSelectedArtworkLiked ? 'liked' : ''
                  }`}
                  onClick={(event) => handleLike(event, selectedArtwork)}
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
                <ArtworkInfoRow label="Dimensions" value={selectedArtwork.Dimensions} />
                <ArtworkInfoRow
                  label="Height (cm)"
                  value={selectedArtwork['Height (cm)']}
                />
                <ArtworkInfoRow
                  label="Width (cm)"
                  value={selectedArtwork['Width (cm)']}
                />
                <ArtworkInfoRow
                  label="Depth (cm)"
                  value={selectedArtwork['Depth (cm)']}
                />
                <ArtworkInfoRow label="On View" value={selectedArtwork.OnView} />
                <ArtworkInfoRow
                  label="Date Acquired"
                  value={selectedArtwork.DateAcquired}
                />
                <ArtworkInfoRow label="Cataloged" value={selectedArtwork.Cataloged} />
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
    </section>
  )
}

export default ArtworkPage
