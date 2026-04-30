import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  ArtistCarouselCard,
  ArtworkCarouselCard,
  CollectionCarouselSection,
  getArtistCarouselMeta,
} from '../components/CollectionCarousel'
import {
  ARTIST_DETAIL_HIDDEN_FIELDS,
  ARTWORK_DETAIL_HIDDEN_FIELDS,
  ArtistDetailsContent,
  ArtworkDetailsContent,
} from '../components/CollectionDetailContent'
import DetailsModal from '../components/DetailsModal'
import momaHeroImage from '../assets/moma_pic_irl.jpg'
import type { AuthUser } from '../types/auth'
import {
  redirectToLoginWithNotice,
  setCurrentUserArtistLike,
  setCurrentUserArtworkLike,
} from '../utils/auth'

const FEATURE_LIMIT = 12
const RELATED_ARTWORK_LIMIT = 200
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

// Check whether an artwork item references the same artist by constituent id.
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

// Check whether an artwork item references the same artist by display name.
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
type HomePageProps = {
  authToken: string | null
  authUser: AuthUser | null
  onAuthUserUpdate: (user: AuthUser) => void
}

// Render the homepage hero, highlight carousels, about teaser, and shared detail flows.
function HomePage({ authToken, authUser, onAuthUserUpdate }: HomePageProps) {
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

  useEffect(() => {
    if (!authUser) {
      setLikedArtworkIds(new Set())
      setLikedArtistIds(new Set())
      setLikedRelatedArtworkIds(new Set())
      return
    }

    const likedArtworkSet = new Set(authUser.likedArtworkIds)
    setLikedArtworkIds(likedArtworkSet)
    setLikedArtistIds(new Set(authUser.likedArtistIds))
    setLikedRelatedArtworkIds(new Set(authUser.likedArtworkIds))
  }, [authUser])

  useEffect(() => {
    let isMounted = true

    // Load the homepage highlight datasets in parallel when the page mounts.
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

  // Keep homepage artwork cards, related artwork, and open artwork modals in sync.
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

  // Keep both homepage artwork like sets in sync for main and nested artwork views.
  const updateArtworkLikeSets = (artworkId: string, shouldLike: boolean) => {
    setLikedArtworkIds((prev) => {
      const next = new Set(prev)
      if (shouldLike) {
        next.add(artworkId)
      } else {
        next.delete(artworkId)
      }
      return next
    })

    setLikedRelatedArtworkIds((prev) => {
      const next = new Set(prev)
      if (shouldLike) {
        next.add(artworkId)
      } else {
        next.delete(artworkId)
      }
      return next
    })
  }

  // Keep homepage artist cards and the active artist modal in sync.
  const updateArtistState = (artistId: string, changes: Partial<Artist>) => {
    setArtists((prev) =>
      prev.map((item) => (item._id === artistId ? { ...item, ...changes } : item))
    )
    setSelectedArtist((prev) =>
      prev && prev._id === artistId ? { ...prev, ...changes } : prev
    )
  }

  // Redirect logged-out visitors to the login page before any like mutation can run.
  const requireSignedInForLike = () => {
    if (!authToken || !authUser) {
      redirectToLoginWithNotice('Please sign in to like items.')
      return false
    }

    return true
  }

  // Close the artwork detail modal shown from the homepage.
  const closeArtworkDetails = () => {
    setSelectedArtwork(null)
    setArtworkDetailsLoading(false)
  }

  // Close the artist detail flow and clear nested related-artwork state.
  const closeArtistDetails = () => {
    setSelectedArtist(null)
    setSelectedRelatedArtwork(null)
    setArtistDetailsLoading(false)
    setRelatedLoading(false)
    setRelatedDetailsLoading(false)
    setRelatedArtwork([])
    setRelatedCarouselPage(0)
  }

  // Load the full artwork record for a homepage artwork highlight.
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

  // Load the full artist record plus related artwork for a homepage artist highlight.
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

  // Load a full artwork record from the related-artwork carousel inside the artist modal.
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

  // Return from a nested related-artwork detail view back to the parent artist modal.
  const goBackToArtistDetails = () => {
    setSelectedRelatedArtwork(null)
    setRelatedDetailsLoading(false)
  }

  // Optimistically toggle likes for artwork shown on homepage cards and artwork modals.
  const handleArtworkLike = async (
    event: MouseEvent<HTMLButtonElement>,
    item: ArtworkSummary
  ) => {
    event.stopPropagation()
    if (!requireSignedInForLike()) {
      return
    }

    const isCurrentlyLiked = likedArtworkIds.has(item._id)
    const currentLikes = Math.max(0, Number(item.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))
    const shouldLike = !isCurrentlyLiked

    updateArtworkLikeSets(item._id, shouldLike)

    updateArtworkState(item._id, { Likes: nextLikes })

    let syncedAccountLike = false

    try {
      if (authToken && authUser) {
        const updatedUser = await setCurrentUserArtworkLike(
          authToken,
          item._id,
          shouldLike
        )
        onAuthUserUpdate(updatedUser)
        syncedAccountLike = true
      }

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
      if (syncedAccountLike && authToken && authUser) {
        try {
          const revertedUser = await setCurrentUserArtworkLike(
            authToken,
            item._id,
            isCurrentlyLiked
          )
          onAuthUserUpdate(revertedUser)
        } catch {
          // Keep the local fallback below if the rollback request also fails.
        }
      }

      updateArtworkLikeSets(item._id, isCurrentlyLiked)
      updateArtworkState(item._id, { Likes: currentLikes })
    }
  }

  // Optimistically toggle likes for artist cards and artist modals.
  const handleArtistLike = async (
    event: MouseEvent<HTMLButtonElement>,
    artist: Artist
  ) => {
    event.stopPropagation()
    if (!requireSignedInForLike()) {
      return
    }

    const isCurrentlyLiked = likedArtistIds.has(artist._id)
    const currentLikes = Math.max(0, Number(artist.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))
    const shouldLike = !isCurrentlyLiked

    setLikedArtistIds((prev) => {
      const next = new Set(prev)
      if (shouldLike) {
        next.add(artist._id)
      } else {
        next.delete(artist._id)
      }
      return next
    })

    updateArtistState(artist._id, { Likes: nextLikes })

    let syncedAccountLike = false

    try {
      if (authToken && authUser) {
        const updatedUser = await setCurrentUserArtistLike(
          authToken,
          artist._id,
          shouldLike
        )
        onAuthUserUpdate(updatedUser)
        syncedAccountLike = true
      }

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
      if (syncedAccountLike && authToken && authUser) {
        try {
          const revertedUser = await setCurrentUserArtistLike(
            authToken,
            artist._id,
            isCurrentlyLiked
          )
          onAuthUserUpdate(revertedUser)
        } catch {
          // Keep the local fallback below if the rollback request also fails.
        }
      }

      setLikedArtistIds((prev) => {
        const next = new Set(prev)
        if (shouldLike) {
          next.delete(artist._id)
        } else {
          next.add(artist._id)
        }
        return next
      })
      updateArtistState(artist._id, { Likes: currentLikes })
    }
  }

  // Optimistically toggle likes for artwork shown inside the artist modal carousel.
  const handleRelatedArtworkLike = async (
    event: MouseEvent<HTMLButtonElement>,
    item: ArtworkSummary
  ) => {
    event.stopPropagation()
    if (!requireSignedInForLike()) {
      return
    }

    const isCurrentlyLiked = likedRelatedArtworkIds.has(item._id)
    const currentLikes = Math.max(0, Number(item.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))
    const shouldLike = !isCurrentlyLiked

    updateArtworkLikeSets(item._id, shouldLike)

    updateArtworkState(item._id, { Likes: nextLikes })

    let syncedAccountLike = false

    try {
      if (authToken && authUser) {
        const updatedUser = await setCurrentUserArtworkLike(
          authToken,
          item._id,
          shouldLike
        )
        onAuthUserUpdate(updatedUser)
        syncedAccountLike = true
      }

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
      if (syncedAccountLike && authToken && authUser) {
        try {
          const revertedUser = await setCurrentUserArtworkLike(
            authToken,
            item._id,
            isCurrentlyLiked
          )
          onAuthUserUpdate(revertedUser)
        } catch {
          // Keep the local fallback below if the rollback request also fails.
        }
      }

      updateArtworkLikeSets(item._id, isCurrentlyLiked)
      updateArtworkState(item._id, { Likes: currentLikes })
    }
  }

  // Keep the related-artwork carousel paging in sync with the current results.
  const relatedCarouselMaxPage = useMemo(() => {
    if (relatedArtwork.length === 0) {
      return 0
    }

    return Math.ceil(relatedArtwork.length / CAROUSEL_PAGE_SIZE) - 1
  }, [relatedArtwork.length])

  // Slice the current page of related artwork for the artist modal carousel.
  const relatedCarouselItems = useMemo(() => {
    const start = relatedCarouselPage * CAROUSEL_PAGE_SIZE
    return relatedArtwork.slice(start, start + CAROUSEL_PAGE_SIZE)
  }, [relatedArtwork, relatedCarouselPage])

  const extraArtistFields =
    selectedArtist === null
      ? []
      : Object.entries(selectedArtist).filter(([key, value]) => {
          if (ARTIST_DETAIL_HIDDEN_FIELDS.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })

  const extraArtworkFields =
    selectedArtwork === null
      ? []
      : Object.entries(selectedArtwork).filter(([key, value]) => {
          if (ARTWORK_DETAIL_HIDDEN_FIELDS.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })

  const extraRelatedArtworkFields =
    selectedRelatedArtwork === null
      ? []
      : Object.entries(selectedRelatedArtwork).filter(([key, value]) => {
          if (ARTWORK_DETAIL_HIDDEN_FIELDS.has(key)) {
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

      <CollectionCarouselSection
        title="Artwork Highlights"
        subtitle="A rotating-style preview of pieces currently living in the collection dataset."
        hasItems={artwork.length > 0}
        status={
          loading ? (
            <p className="status-text">Loading artwork highlights...</p>
          ) : error ? (
            <p className="status-text">Error: {error}</p>
          ) : undefined
        }
        footer={
          <a href="#/artwork" className="show-more-btn home-section-btn">
            View All Artwork
          </a>
        }
      >
        {artwork.map((item) => {
          const isLiked = likedArtworkIds.has(item._id)
          const likeActionLabel = authUser
            ? `${isLiked ? 'Unlike' : 'Like'} ${item.Title || 'artwork'}`
            : `Sign in to like ${item.Title || 'artwork'}`

          return (
            <ArtworkCarouselCard
              key={item._id}
              artwork={item}
              metaText={item.Date || 'Date unavailable'}
              onOpen={openArtworkDetails}
              actionButton={
                <button
                  type="button"
                  className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
                  onClick={(event) => handleArtworkLike(event, item)}
                  aria-label={likeActionLabel}
                  title={authUser ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
                >
                  {isLiked ? '\u2665' : '\u2661'}
                </button>
              }
            />
          )
        })}
      </CollectionCarouselSection>

      <CollectionCarouselSection
        title="Artists to Explore"
        subtitle="A quick way into the people behind the collection."
        hasItems={artists.length > 0}
        status={
          loading ? (
            <p className="status-text">Loading artists...</p>
          ) : error ? (
            <p className="status-text">Error: {error}</p>
          ) : undefined
        }
        footer={
          <a href="#/artists" className="show-more-btn home-section-btn">
            View All Artists
          </a>
        }
      >
        {artists.map((artist) => {
          const isLiked = likedArtistIds.has(artist._id)
          const likeActionLabel = authUser
            ? `${isLiked ? 'Unlike' : 'Like'} ${artist.DisplayName || 'artist'}`
            : `Sign in to like ${artist.DisplayName || 'artist'}`

          return (
            <ArtistCarouselCard
              key={artist._id}
              artist={artist}
              metaText={getArtistCarouselMeta(artist)}
              bioText={
                artist.ArtistBio?.trim() ||
                'Biography unavailable in the current dataset.'
              }
              onOpen={openArtistDetails}
              actionButton={
                <button
                  type="button"
                  className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
                  onClick={(event) => handleArtistLike(event, artist)}
                  aria-label={likeActionLabel}
                  title={authUser ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
                >
                  {isLiked ? '\u2665' : '\u2661'}
                </button>
              }
            />
          )
        })}
      </CollectionCarouselSection>

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
          <ArtworkDetailsContent
            artwork={selectedArtwork}
            extraFields={extraArtworkFields}
            isLiked={isSelectedArtworkLiked}
            onToggleLike={handleArtworkLike}
            likeAriaLabel={
              authUser
                ? `${isSelectedArtworkLiked ? 'Unlike' : 'Like'} ${
                    selectedArtwork.Title || 'artwork'
                  }`
                : `Sign in to like ${selectedArtwork.Title || 'artwork'}`
            }
            likeTitle={
              authUser
                ? isSelectedArtworkLiked
                  ? 'Unlike'
                  : 'Like'
                : 'Sign in to like'
            }
          />
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
          <ArtworkDetailsContent
            artwork={selectedRelatedArtwork}
            extraFields={extraRelatedArtworkFields}
            isLiked={isSelectedRelatedArtworkLiked}
            onToggleLike={handleRelatedArtworkLike}
            likeAriaLabel={
              authUser
                ? `${isSelectedRelatedArtworkLiked ? 'Unlike' : 'Like'} ${
                    selectedRelatedArtwork.Title || 'artwork'
                  }`
                : `Sign in to like ${selectedRelatedArtwork.Title || 'artwork'}`
            }
            likeTitle={
              authUser
                ? isSelectedRelatedArtworkLiked
                  ? 'Unlike'
                  : 'Like'
                : 'Sign in to like'
            }
          />
        ) : (
          selectedArtist && (
            <ArtistDetailsContent
              artist={selectedArtist}
              extraFields={extraArtistFields}
              isLiked={isSelectedArtistLiked}
              onToggleLike={handleArtistLike}
              likeAriaLabel={
                authUser
                  ? `${isSelectedArtistLiked ? 'Unlike' : 'Like'} ${
                      selectedArtist.DisplayName || 'artist'
                    }`
                  : `Sign in to like ${selectedArtist.DisplayName || 'artist'}`
              }
              likeTitle={
                authUser
                  ? isSelectedArtistLiked
                    ? 'Unlike'
                    : 'Like'
                  : 'Sign in to like'
              }
              relatedArtwork={relatedArtwork}
              relatedArtworkItems={relatedCarouselItems}
              relatedLoading={relatedLoading}
              relatedCarouselPage={relatedCarouselPage}
              relatedCarouselMaxPage={relatedCarouselMaxPage}
              onPreviousRelatedPage={() =>
                setRelatedCarouselPage((prev) => Math.max(0, prev - 1))
              }
              onNextRelatedPage={() =>
                setRelatedCarouselPage((prev) =>
                  Math.min(relatedCarouselMaxPage, prev + 1),
                )
              }
              onOpenRelatedArtwork={openRelatedArtworkDetails}
              renderRelatedArtworkCardActions={(item) => {
                const isLiked = likedRelatedArtworkIds.has(item._id)
                const likeActionLabel = authUser
                  ? `${isLiked ? 'Unlike' : 'Like'} ${item.Title || 'artwork'}`
                  : `Sign in to like ${item.Title || 'artwork'}`

                return (
                  <button
                    type="button"
                    className={`card-heart-btn ${isLiked ? 'liked' : ''}`}
                    onClick={(event) => handleRelatedArtworkLike(event, item)}
                    aria-label={likeActionLabel}
                    title={
                      authUser
                        ? isLiked
                          ? 'Unlike'
                          : 'Like'
                        : 'Sign in to like'
                    }
                  >
                    {isLiked ? '\u2665' : '\u2661'}
                  </button>
                )
              }}
            />
          )
        )}
      </DetailsModal>
    </section>
  )
}

export default HomePage
