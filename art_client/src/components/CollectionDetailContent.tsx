import type { MouseEvent, ReactNode } from 'react'

type DetailArtist = {
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

type DetailArtwork = {
  _id: string
  Title?: string
  Date?: string
  Artist?: string[] | string
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

type ArtworkDetailsContentProps = {
  artwork: DetailArtwork
  extraFields?: Array<[string, unknown]>
  toolbar?: ReactNode
  isLiked?: boolean
  onToggleLike?: (
    event: MouseEvent<HTMLButtonElement>,
    artwork: DetailArtwork,
  ) => void
  likeAriaLabel?: string
  likeTitle?: string
}

type ArtistDetailsContentProps = {
  artist: DetailArtist
  extraFields?: Array<[string, unknown]>
  toolbar?: ReactNode
  isLiked?: boolean
  onToggleLike?: (
    event: MouseEvent<HTMLButtonElement>,
    artist: DetailArtist,
  ) => void
  likeAriaLabel?: string
  likeTitle?: string
  relatedArtwork: DetailArtwork[]
  relatedArtworkItems: DetailArtwork[]
  relatedLoading: boolean
  relatedCarouselPage: number
  relatedCarouselMaxPage: number
  onPreviousRelatedPage: () => void
  onNextRelatedPage: () => void
  onOpenRelatedArtwork: (artwork: DetailArtwork) => void
  renderRelatedArtworkCardActions?: (artwork: DetailArtwork) => ReactNode
}

export const ARTIST_DETAIL_HIDDEN_FIELDS = new Set([
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

export const ARTWORK_DETAIL_HIDDEN_FIELDS = new Set([
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

// Format detail values for modal rows and fallback text.
export function asDisplayValue(value: unknown) {
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

// Turn the artwork artist field into a readable label for cards and modal rows.
export function getArtistLabel(artist: DetailArtwork['Artist']) {
  if (Array.isArray(artist)) {
    return artist.filter(Boolean).join(', ')
  }

  if (typeof artist === 'string') {
    return artist
  }

  return 'Unknown artist'
}

// Render a label/value row inside shared artist and artwork detail layouts.
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

// Render the shared artwork detail layout used across collection, home, and account views.
export function ArtworkDetailsContent({
  artwork,
  extraFields = [],
  toolbar,
  isLiked = false,
  onToggleLike,
  likeAriaLabel = 'Like artwork',
  likeTitle = 'Like',
}: ArtworkDetailsContentProps) {
  return (
    <div className="modal-content artwork-modal-layout">
      {toolbar}
      <div className="artwork-main-grid">
        <section className={`modal-section ${onToggleLike ? 'modal-section-with-like' : ''}`}>
          <h3 className="modal-section-title">Artwork Information</h3>
          <div className="modal-info-grid">
            <InfoRow label="Title" value={artwork.Title} />
            <InfoRow label="Artist" value={getArtistLabel(artwork.Artist)} />
            <InfoRow label="Date" value={artwork.Date} />
            <InfoRow label="Medium" value={artwork.Medium} />
            <InfoRow label="Classification" value={artwork.Classification} />
            <InfoRow label="Department" value={artwork.Department} />
            <InfoRow label="Accession Number" value={artwork.AccessionNumber} />
            <InfoRow label="Object ID" value={artwork.ObjectID} />
            <InfoRow label="Likes" value={artwork.Likes ?? 0} />
          </div>
          {onToggleLike ? (
            <button
              type="button"
              className={`modal-section-like-btn ${isLiked ? 'liked' : ''}`}
              onClick={(event) => onToggleLike(event, artwork)}
              aria-label={likeAriaLabel}
              title={likeTitle}
            >
              {isLiked ? '\u2665' : '\u2661'}
            </button>
          ) : null}
        </section>

        <section className="modal-section artwork-image-section">
          <h3 className="modal-section-title">Artwork Image</h3>
          {artwork.ImageURL ? (
            <img
              src={artwork.ImageURL}
              alt={artwork.Title || 'Artwork image'}
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
          <InfoRow label="Dimensions" value={artwork.Dimensions} />
          <InfoRow label="Height (cm)" value={artwork['Height (cm)']} />
          <InfoRow label="Width (cm)" value={artwork['Width (cm)']} />
          <InfoRow label="Depth (cm)" value={artwork['Depth (cm)']} />
          <InfoRow label="On View" value={artwork.OnView} />
          <InfoRow label="Date Acquired" value={artwork.DateAcquired} />
          <InfoRow label="Cataloged" value={artwork.Cataloged} />
        </div>
        <p className="modal-bio">
          <span className="modal-info-label">Credit Line:</span>{' '}
          {asDisplayValue(artwork.CreditLine)}
        </p>
      </section>

      <section className="modal-section">
        <h3 className="modal-section-title">Links</h3>
        <div className="modal-info-grid">
          <div className="modal-info-row">
            <span className="modal-info-label">Artwork URL</span>
            <span className="modal-info-value">
              {typeof artwork.URL === 'string' && artwork.URL ? (
                <a
                  href={artwork.URL}
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
              {typeof artwork.ImageURL === 'string' && artwork.ImageURL ? (
                <a
                  href={artwork.ImageURL}
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

      {extraFields.length > 0 && (
        <section className="modal-section">
          <h3 className="modal-section-title">Additional Details</h3>
          <div className="details-list">
            {extraFields.map(([key, value]) => (
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
}

// Render the shared artist detail layout plus the related-artwork carousel.
export function ArtistDetailsContent({
  artist,
  extraFields = [],
  toolbar,
  isLiked = false,
  onToggleLike,
  likeAriaLabel = 'Like artist',
  likeTitle = 'Like',
  relatedArtwork,
  relatedArtworkItems,
  relatedLoading,
  relatedCarouselPage,
  relatedCarouselMaxPage,
  onPreviousRelatedPage,
  onNextRelatedPage,
  onOpenRelatedArtwork,
  renderRelatedArtworkCardActions,
}: ArtistDetailsContentProps) {
  return (
    <div className="modal-content">
      {toolbar}
      <section className={`modal-section ${onToggleLike ? 'modal-section-with-like' : ''}`}>
        <h3 className="modal-section-title">Artist Information</h3>
        <div className="modal-info-grid">
          <InfoRow label="Name" value={artist.DisplayName} />
          <InfoRow label="Nationality" value={artist.Nationality} />
          <InfoRow label="Gender" value={artist.Gender} />
          <InfoRow label="Constituent ID" value={artist.ConstituentID} />
          <InfoRow
            label="Life Span"
            value={`${asDisplayValue(artist.BeginDate)} - ${asDisplayValue(artist.EndDate)}`}
          />
          <InfoRow label="Likes" value={artist.Likes ?? 0} />
        </div>
        {onToggleLike ? (
          <button
            type="button"
            className={`modal-section-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(event) => onToggleLike(event, artist)}
            aria-label={likeAriaLabel}
            title={likeTitle}
          >
            {isLiked ? '\u2665' : '\u2661'}
          </button>
        ) : null}
        <p className="modal-bio">
          <span className="modal-info-label">Biography:</span>{' '}
          {asDisplayValue(artist.ArtistBio)}
        </p>
      </section>

      <section className="modal-section">
        <h3 className="modal-section-title">Identifiers</h3>
        <div className="modal-info-grid">
          <InfoRow label="ULAN" value={artist.ULAN} />
          <InfoRow label="Wiki QID" value={artist['Wiki QID']} />
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
                onClick={onPreviousRelatedPage}
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
                onClick={onNextRelatedPage}
                disabled={relatedCarouselPage >= relatedCarouselMaxPage}
              >
                Next
              </button>
            </div>
            <div className="carousel-grid">
              {relatedArtworkItems.map((item) => (
                <article
                  className="card"
                  key={item._id}
                  onClick={() => onOpenRelatedArtwork(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenRelatedArtwork(item)
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
                  <h4 className="card-title">{item.Title || 'Untitled'}</h4>
                  <p className="card-meta">{getArtistLabel(item.Artist)}</p>
                  <p className="card-meta">{item.Date || 'Unknown date'}</p>
                  <p className="card-likes">Likes: {item.Likes ?? 0}</p>
                  {renderRelatedArtworkCardActions?.(item)}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {extraFields.length > 0 && (
        <section className="modal-section">
          <h3 className="modal-section-title">Additional Details</h3>
          <div className="details-list">
            {extraFields.map(([key, value]) => (
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
}
