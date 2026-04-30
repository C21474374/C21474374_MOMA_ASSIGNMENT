import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  ArtworkCarouselCard,
  CollectionCarouselSection,
} from '../components/CollectionCarousel'
import {
  ARTWORK_DETAIL_HIDDEN_FIELDS,
  ArtworkDetailsContent,
} from '../components/CollectionDetailContent'
import DetailsModal from '../components/DetailsModal'
import momaHeroImage from '../assets/moma_pic_irl.jpg'
import type { AuthUser } from '../types/auth'
import {
  getCurrentUserArtworkRecommendations,
  redirectToLoginWithNotice,
  setCurrentUserArtworkLike,
} from '../utils/auth'

const RECOMMENDATION_LIMIT = 12
const HIGHLIGHTED_ARTWORK_LIMIT = 12

type ArtworkSummary = {
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
  ConstituentID?: number[] | number
  ObjectID?: number
  URL?: string
  OnView?: string
  ImageURL?: string
  Likes?: number
  [key: string]: unknown
}

type HomePageProps = {
  authToken: string | null
  authUser: AuthUser | null
  onAuthUserUpdate: (user: AuthUser) => void
}

// Render the homepage hero, a personalized or highlighted artwork carousel, and the shared artwork detail modal.
function HomePage({ authToken, authUser, onAuthUserUpdate }: HomePageProps) {
  const [recommendedArtwork, setRecommendedArtwork] = useState<ArtworkSummary[]>([])
  const [highlightedArtwork, setHighlightedArtwork] = useState<ArtworkSummary[]>([])
  const [likedArtworkIds, setLikedArtworkIds] = useState<Set<string>>(new Set())
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkSummary | null>(null)
  const [artworkDetailsLoading, setArtworkDetailsLoading] = useState(false)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState('')
  const [highlightedLoading, setHighlightedLoading] = useState(false)
  const [highlightedError, setHighlightedError] = useState('')

  useEffect(() => {
    if (!authUser) {
      setLikedArtworkIds(new Set())
      return
    }

    setLikedArtworkIds(new Set(authUser.likedArtworkIds))
  }, [authUser])

  useEffect(() => {
    let isMounted = true

    // Load a compact set of personalized artwork recommendations for signed-in users.
    const loadRecommendations = async () => {
      if (!authToken || !authUser) {
        setRecommendedArtwork([])
        setRecommendationsError('')
        setRecommendationsLoading(false)
        return
      }

      if (
        authUser.likedArtistIds.length === 0 &&
        authUser.likedArtworkIds.length === 0
      ) {
        setRecommendedArtwork([])
        setRecommendationsError('')
        setRecommendationsLoading(false)
        return
      }

      try {
        setRecommendationsLoading(true)
        const recommendedItems =
          await getCurrentUserArtworkRecommendations<ArtworkSummary>(
            authToken,
            RECOMMENDATION_LIMIT,
          )

        if (isMounted) {
          setRecommendedArtwork(recommendedItems)
          setRecommendationsError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setRecommendedArtwork([])
          setRecommendationsError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load recommendations',
          )
        }
      } finally {
        if (isMounted) {
          setRecommendationsLoading(false)
        }
      }
    }

    loadRecommendations()

    return () => {
      isMounted = false
    }
  }, [authToken, authUser])

  useEffect(() => {
    let isMounted = true

    // Load a browsable highlighted set for logged-out visitors.
    const loadHighlightedArtwork = async () => {
      if (authUser) {
        setHighlightedArtwork([])
        setHighlightedError('')
        setHighlightedLoading(false)
        return
      }

      try {
        setHighlightedLoading(true)
        const response = await fetch('/api/artwork')
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const artwork = (await response.json()) as ArtworkSummary[]
        const highlightedItems = [...artwork]
          .sort((first, second) => {
            const likeDifference = Number(second.Likes ?? 0) - Number(first.Likes ?? 0)
            if (likeDifference !== 0) {
              return likeDifference
            }

            return String(first.Title || '').localeCompare(String(second.Title || ''))
          })
          .slice(0, HIGHLIGHTED_ARTWORK_LIMIT)

        if (isMounted) {
          setHighlightedArtwork(highlightedItems)
          setHighlightedError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setHighlightedArtwork([])
          setHighlightedError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load highlighted artwork',
          )
        }
      } finally {
        if (isMounted) {
          setHighlightedLoading(false)
        }
      }
    }

    loadHighlightedArtwork()

    return () => {
      isMounted = false
    }
  }, [authUser])

  // Keep homepage carousel cards and the open artwork modal in sync after likes or detail loads.
  const updateHomepageArtworkState = (
    artworkId: string,
    changes: Partial<ArtworkSummary>,
  ) => {
    setRecommendedArtwork((prev) =>
      prev.map((item) => (item._id === artworkId ? { ...item, ...changes } : item)),
    )
    setHighlightedArtwork((prev) =>
      prev.map((item) => (item._id === artworkId ? { ...item, ...changes } : item)),
    )
    setSelectedArtwork((prev) =>
      prev && prev._id === artworkId ? { ...prev, ...changes } : prev,
    )
  }

  // Redirect logged-out visitors to login before any like action runs.
  const requireSignedInForLike = () => {
    if (!authToken || !authUser) {
      redirectToLoginWithNotice('Please sign in to like items.')
      return false
    }

    return true
  }

  // Close the artwork detail modal shown from the recommendation carousel.
  const closeArtworkDetails = () => {
    setSelectedArtwork(null)
    setArtworkDetailsLoading(false)
  }

  // Load the full artwork record when a recommendation card is opened.
  const openArtworkDetails = async (item: ArtworkSummary) => {
    setSelectedArtwork(item)
    setArtworkDetailsLoading(true)

    try {
      const response = await fetch(`/api/artwork/${item._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const detailedArtwork = (await response.json()) as ArtworkSummary
      updateHomepageArtworkState(item._id, detailedArtwork)
      setSelectedArtwork(detailedArtwork)
    } catch {
      setSelectedArtwork(item)
    } finally {
      setArtworkDetailsLoading(false)
    }
  }

  // Optimistically toggle likes for recommended artwork and remove newly liked items from the recommendation list.
  const handleArtworkLike = async (
    event: MouseEvent<HTMLButtonElement>,
    item: ArtworkSummary,
  ) => {
    event.stopPropagation()
    if (!requireSignedInForLike()) {
      return
    }

    const isCurrentlyLiked = likedArtworkIds.has(item._id)
    const currentLikes = Math.max(0, Number(item.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))
    const shouldLike = !isCurrentlyLiked
    const previousRecommendations = recommendedArtwork

    setLikedArtworkIds((prev) => {
      const next = new Set(prev)
      if (shouldLike) {
        next.add(item._id)
      } else {
        next.delete(item._id)
      }
      return next
    })

    if (shouldLike) {
      setRecommendedArtwork((prev) => prev.filter((entry) => entry._id !== item._id))
      setSelectedArtwork((prev) =>
        prev && prev._id === item._id ? { ...prev, Likes: nextLikes } : prev,
      )
    } else {
      updateHomepageArtworkState(item._id, { Likes: nextLikes })
    }

    let syncedAccountLike = false

    try {
      if (authToken && authUser) {
        const updatedUser = await setCurrentUserArtworkLike(
          authToken,
          item._id,
          shouldLike,
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
      if (shouldLike) {
        setSelectedArtwork((prev) =>
          prev && prev._id === item._id ? updatedArtwork : prev,
        )
      } else {
        updateHomepageArtworkState(item._id, updatedArtwork)
      }
    } catch {
      if (syncedAccountLike && authToken && authUser) {
        try {
          const revertedUser = await setCurrentUserArtworkLike(
            authToken,
            item._id,
            isCurrentlyLiked,
          )
          onAuthUserUpdate(revertedUser)
        } catch {
          // Keep the local fallback below if the rollback request also fails.
        }
      }

      setLikedArtworkIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlyLiked) {
          next.add(item._id)
        } else {
          next.delete(item._id)
        }
        return next
      })
      setRecommendedArtwork(previousRecommendations)
      setSelectedArtwork((prev) =>
        prev && prev._id === item._id ? { ...prev, Likes: currentLikes } : prev,
      )
    }
  }

  const extraArtworkFields =
    selectedArtwork === null
      ? []
      : Object.entries(selectedArtwork).filter(([key, value]) => {
          if (ARTWORK_DETAIL_HIDDEN_FIELDS.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })

  const isSelectedArtworkLiked = selectedArtwork
    ? likedArtworkIds.has(selectedArtwork._id)
    : false
  const isShowingRecommendations = Boolean(authUser)
  const hasRecommendationSeedLikes = Boolean(
    authUser &&
      (authUser.likedArtistIds.length > 0 || authUser.likedArtworkIds.length > 0),
  )
  const carouselArtwork = isShowingRecommendations
    ? recommendedArtwork
    : highlightedArtwork
  const carouselTitle = isShowingRecommendations
    ? 'Recommended For You'
    : 'Highlighted Artworks'
  const carouselSubtitle = isShowingRecommendations
    ? 'Artwork matched from the artists and pieces you have already liked.'
    : 'Popular pieces from the collection to help you start exploring.'
  const carouselStatus = !isShowingRecommendations ? (
    highlightedLoading ? (
      <p className="status-text">Loading highlighted artwork...</p>
    ) : highlightedError ? (
      <p className="status-text">Error: {highlightedError}</p>
    ) : highlightedArtwork.length === 0 ? (
      <p className="status-text">No highlighted artwork available right now.</p>
    ) : undefined
  ) : recommendationsLoading ? (
    <p className="status-text">Loading recommendations...</p>
  ) : recommendationsError ? (
    <p className="status-text">Error: {recommendationsError}</p>
  ) : !hasRecommendationSeedLikes ? (
    <p className="status-text">
      Like some artists or artwork to unlock recommendations.
    </p>
  ) : recommendedArtwork.length === 0 ? (
    <p className="status-text">
      No recommendations yet. Try liking a few more items.
    </p>
  ) : undefined

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
        title={carouselTitle}
        subtitle={carouselSubtitle}
        hasItems={carouselArtwork.length > 0}
        status={carouselStatus}
      >
        {carouselArtwork.map((item) => {
          const isLiked = likedArtworkIds.has(item._id)
          const likeActionLabel = authUser
            ? `${isLiked ? 'Unlike' : 'Like'} ${item.Title || 'artwork'}`
            : `Sign in to like ${item.Title || 'artwork'}`

          return (
            <ArtworkCarouselCard
              key={item._id}
              artwork={item}
              metaText={
                item.Date || item.Classification || item.Department || 'Date unavailable'
              }
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

      <section className="home-about-teaser">
        <div className="home-about-copy">
          <p className="home-section-kicker home-about-kicker">About This Page</p>
          <p className="page-subtitle home-section-subtitle">
            The technical write-up explains how the React frontend, Express backend,
            and MongoDB database work together. It also covers the technology choices,
            current limitations, and alternative approaches that could be used to build
            the same application in a different way.
          </p>
        </div>
        <div className="home-about-actions">
          <a href="#/about" className="show-more-btn home-section-btn">
            About this page
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
    </section>
  )
}

export default HomePage
