import { useRef } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { getArtistLabel } from './CollectionDetailContent'

type ArtworkCarouselItem = {
  _id: string
  Title?: string
  Artist?: string[] | string
  Date?: string
  ImageURL?: string
  Likes?: number
}

type ArtistCarouselItem = {
  _id: string
  DisplayName?: string
  ArtistBio?: string
  Nationality?: string
  BeginDate?: number
  EndDate?: number
  Likes?: number
}

type CollectionCarouselSectionProps = {
  title: string
  subtitle: string
  hasItems: boolean
  status?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

type ArtworkCarouselCardProps<T extends ArtworkCarouselItem> = {
  artwork: T
  metaText: string
  onOpen: (artwork: T) => void
  actionButton?: ReactNode
}

type ArtistCarouselCardProps<T extends ArtistCarouselItem> = {
  artist: T
  metaText: string
  bioText: string
  onOpen: (artist: T) => void
  actionButton?: ReactNode
  titleFallback?: string
}

// Scroll a horizontal carousel by roughly one visible frame at a time.
function scrollTrack(
  trackRef: RefObject<HTMLDivElement | null>,
  direction: 'next' | 'prev',
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

// Open a card from keyboard input so the carousel stays accessible.
function handleCardKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onActivate: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onActivate()
  }
}

// Build the short nationality and lifespan line used on artist carousel cards.
function getArtistCarouselMeta(artist: ArtistCarouselItem) {
  const nationality = artist.Nationality || 'Unknown nationality'
  const start = artist.BeginDate ? String(artist.BeginDate) : ''
  const end = artist.EndDate ? String(artist.EndDate) : ''

  if (!start && !end) {
    return nationality
  }

  return `${nationality} - ${start || '?'}${end ? `-${end}` : ''}`
}

// Render a shared carousel section shell with the standard heading and scroll controls.
function CollectionCarouselSection({
  title,
  subtitle,
  hasItems,
  status,
  footer,
  children,
}: CollectionCarouselSectionProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  return (
    <section className="home-section">
      <div className="home-section-header">
        <div>
          <h2 className="page-title home-section-title">{title}</h2>
          <p className="page-subtitle home-section-subtitle">{subtitle}</p>
        </div>
        <div className="home-section-actions">
          <div className="home-carousel-controls">
            <button
              type="button"
              className="carousel-btn"
              onClick={() => scrollTrack(trackRef, 'prev')}
              disabled={!hasItems}
            >
              Prev
            </button>
            <button
              type="button"
              className="carousel-btn"
              onClick={() => scrollTrack(trackRef, 'next')}
              disabled={!hasItems}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {status ? (
        status
      ) : (
        <div className="home-carousel-track" ref={trackRef}>
          {children}
        </div>
      )}

      {footer ? <div className="home-section-footer">{footer}</div> : null}
    </section>
  )
}

// Render a shared artwork card used by the homepage and account carousels.
function ArtworkCarouselCard<T extends ArtworkCarouselItem>({
  artwork,
  metaText,
  onOpen,
  actionButton,
}: ArtworkCarouselCardProps<T>) {
  const title = artwork.Title || 'Untitled'

  return (
    <article
      className="card home-carousel-card"
      onClick={() => onOpen(artwork)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(artwork))}
    >
      {artwork.ImageURL ? (
        <img
          src={artwork.ImageURL}
          alt={title}
          className="card-image home-carousel-image"
          loading="lazy"
        />
      ) : (
        <div className="card-image card-image-empty home-carousel-image">No image</div>
      )}
      <h3 className="card-title">{title}</h3>
      <p className="card-meta">{getArtistLabel(artwork.Artist)}</p>
      <p className="card-meta">{metaText}</p>
      <p className="card-likes">Likes: {artwork.Likes ?? 0}</p>
      {actionButton}
    </article>
  )
}

// Render a shared artist card used by the homepage and account carousels.
function ArtistCarouselCard<T extends ArtistCarouselItem>({
  artist,
  metaText,
  bioText,
  onOpen,
  actionButton,
  titleFallback = 'Unknown artist',
}: ArtistCarouselCardProps<T>) {
  return (
    <article
      className="card home-carousel-card home-artist-card"
      onClick={() => onOpen(artist)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(artist))}
    >
      <div className="home-artist-card-body">
        <h3 className="card-title">{artist.DisplayName || titleFallback}</h3>
        <p className="card-meta">{metaText}</p>
        <p className="home-artist-bio">{bioText}</p>
      </div>
      <p className="card-likes">Likes: {artist.Likes ?? 0}</p>
      {actionButton}
    </article>
  )
}

export {
  ArtistCarouselCard,
  ArtworkCarouselCard,
  CollectionCarouselSection,
  getArtistCarouselMeta,
}
