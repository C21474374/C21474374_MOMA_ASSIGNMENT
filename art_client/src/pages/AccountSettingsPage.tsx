import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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
import type { AuthResponse, AuthUser } from '../types/auth'
import {
  deleteCurrentUser,
  setCurrentUserArtistLike,
  setCurrentUserArtworkLike,
  updateCurrentUser,
} from '../utils/auth'

const RELATED_ARTWORK_LIMIT = 200
const CAROUSEL_PAGE_SIZE = 3

type LikedArtist = {
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

type LikedArtwork = {
  _id: string
  Title?: string
  Artist?: string[] | string
  Date?: string
  ImageURL?: string
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
  Likes?: number
  [key: string]: unknown
}

type AccountSettingsPageProps = {
  authToken: string | null
  user: AuthUser | null
  onAuthSuccess: (response: AuthResponse) => void
  onAuthUserUpdate: (user: AuthUser) => void
  onAccountDeleted: () => void
}

// Format stored account timestamps for the settings screen.
function formatDate(value: string | undefined) {
  if (!value) {
    return 'N/A'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A'
  }

  return parsedDate.toLocaleString()
}

// Check whether an artwork item references the same artist by constituent id.
function hasMatchingConstituent(
  artworkConstituent: number[] | number | undefined,
  artistConstituent: number,
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
  artistName: string,
) {
  if (!artistName) {
    return false
  }

  if (Array.isArray(artworkArtist)) {
    return artworkArtist.some(
      (name) => String(name).trim().toLowerCase() === artistName,
    )
  }

  if (typeof artworkArtist === 'string') {
    return artworkArtist.trim().toLowerCase() === artistName
  }

  return false
}
// Load liked artist or artwork records one-by-one from the public collection endpoints.
async function fetchLikedRecords<T>(endpoint: 'artists' | 'artwork', ids: string[]) {
  const responses = await Promise.allSettled(
    ids.map(async (id) => {
      const response = await fetch(`/api/${endpoint}/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to load ${endpoint} item ${id}`)
      }

      return (await response.json()) as T
    }),
  )

  return responses.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  )
}

// Show account profile actions plus liked-artwork and liked-artist carousels for the signed-in user.
function AccountSettingsPage({
  authToken,
  user,
  onAuthSuccess,
  onAuthUserUpdate,
  onAccountDeleted,
}: AccountSettingsPageProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [likedArtists, setLikedArtists] = useState<LikedArtist[]>([])
  const [likedArtwork, setLikedArtwork] = useState<LikedArtwork[]>([])
  const [likedLoading, setLikedLoading] = useState(false)
  const [likedError, setLikedError] = useState('')
  const [likedActionError, setLikedActionError] = useState('')
  const [selectedArtwork, setSelectedArtwork] = useState<LikedArtwork | null>(null)
  const [selectedArtist, setSelectedArtist] = useState<LikedArtist | null>(null)
  const [selectedRelatedArtwork, setSelectedRelatedArtwork] =
    useState<LikedArtwork | null>(null)
  const [artworkDetailsLoading, setArtworkDetailsLoading] = useState(false)
  const [artistDetailsLoading, setArtistDetailsLoading] = useState(false)
  const [relatedArtwork, setRelatedArtwork] = useState<LikedArtwork[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedDetailsLoading, setRelatedDetailsLoading] = useState(false)
  const [relatedCarouselPage, setRelatedCarouselPage] = useState(0)
  const [pendingLikedArtistIds, setPendingLikedArtistIds] = useState<Set<string>>(
    new Set(),
  )
  const [pendingLikedArtworkIds, setPendingLikedArtworkIds] = useState<Set<string>>(
    new Set(),
  )

  useEffect(() => {
    if (!user) {
      setDisplayName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setIsEditing(false)
      setFormError('')
      setFormSuccess('')
      setLikedActionError('')
      setSelectedArtwork(null)
      setSelectedArtist(null)
      setSelectedRelatedArtwork(null)
      setRelatedArtwork([])
      setRelatedCarouselPage(0)
      return
    }

    setDisplayName(user.displayName || '')
    setEmail(user.email)
    setPassword('')
    setConfirmPassword('')
    setIsEditing(false)
    setFormError('')
  }, [user])

  useEffect(() => {
    let isMounted = true

    const loadLikedItems = async () => {
      if (!user) {
        setLikedArtists([])
        setLikedArtwork([])
        setLikedError('')
        setLikedActionError('')
        return
      }

      if (user.likedArtistIds.length === 0 && user.likedArtworkIds.length === 0) {
        setLikedArtists([])
        setLikedArtwork([])
        setLikedError('')
        setLikedActionError('')
        return
      }

      try {
        setLikedLoading(true)
        const [artists, artwork] = await Promise.all([
          fetchLikedRecords<LikedArtist>('artists', user.likedArtistIds),
          fetchLikedRecords<LikedArtwork>('artwork', user.likedArtworkIds),
        ])

        if (isMounted) {
          setLikedArtists(artists)
          setLikedArtwork(artwork)
          setLikedError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setLikedError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load liked items'
          )
        }
      } finally {
        if (isMounted) {
          setLikedLoading(false)
        }
      }
    }

    loadLikedItems()

    return () => {
      isMounted = false
    }
  }, [user])

  // Close the artwork detail modal opened from the liked artwork carousel.
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

  // Load the full artwork record for a liked artwork card.
  const openArtworkDetails = async (item: LikedArtwork) => {
    closeArtistDetails()
    setSelectedArtwork(item)
    setArtworkDetailsLoading(true)

    try {
      const response = await fetch(`/api/artwork/${item._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const detailedArtwork = (await response.json()) as LikedArtwork
      setSelectedArtwork(detailedArtwork)
    } catch {
      setSelectedArtwork(item)
    } finally {
      setArtworkDetailsLoading(false)
    }
  }

  // Load the full artist record plus related artwork for a liked artist card.
  const openArtistDetails = async (artist: LikedArtist) => {
    closeArtworkDetails()
    setSelectedArtist(artist)
    setSelectedRelatedArtwork(null)
    setArtistDetailsLoading(true)
    setRelatedLoading(true)
    setRelatedDetailsLoading(false)
    setRelatedArtwork([])
    setRelatedCarouselPage(0)

    let detailedArtist: LikedArtist = artist

    try {
      const response = await fetch(`/api/artists/${artist._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      detailedArtist = (await response.json()) as LikedArtist
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

      const artworkData = (await response.json()) as LikedArtwork[]
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

  // Load a full artwork record from the artist modal carousel.
  const openRelatedArtworkDetails = async (item: LikedArtwork) => {
    setSelectedRelatedArtwork(item)
    setRelatedDetailsLoading(true)

    try {
      const response = await fetch(`/api/artwork/${item._id}`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const detailedArtwork = (await response.json()) as LikedArtwork
      setSelectedRelatedArtwork(detailedArtwork)
      setRelatedArtwork((prev) =>
        prev.map((artworkItem) =>
          artworkItem._id === item._id ? detailedArtwork : artworkItem,
        ),
      )
    } catch {
      setSelectedRelatedArtwork(item)
    } finally {
      setRelatedDetailsLoading(false)
    }
  }

  // Return from nested related artwork details back to the parent artist modal.
  const goBackToArtistDetails = () => {
    setSelectedRelatedArtwork(null)
    setRelatedDetailsLoading(false)
  }

  // Remove a liked artwork from the signed-in account and keep the shared count in sync.
  const handleUnlikeArtwork = async (item: LikedArtwork) => {
    if (!authToken || !user) {
      setLikedActionError('You must be signed in to update your liked artwork.')
      return
    }

    setLikedActionError('')
    setPendingLikedArtworkIds((prev) => {
      const next = new Set(prev)
      next.add(item._id)
      return next
    })

    const currentLikes = Math.max(0, Number(item.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes - 1)
    let syncedAccountLike = false

    try {
      const updatedUser = await setCurrentUserArtworkLike(authToken, item._id, false)
      onAuthUserUpdate(updatedUser)
      syncedAccountLike = true

      const response = await fetch(`/api/artwork/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Likes: nextLikes }),
      })

      if (!response.ok) {
        throw new Error('Failed to update artwork like count.')
      }

      setLikedArtwork((prev) => prev.filter((artworkItem) => artworkItem._id !== item._id))
      setSelectedArtwork((prev) => (prev && prev._id === item._id ? null : prev))
      setSelectedRelatedArtwork((prev) =>
        prev && prev._id === item._id ? null : prev,
      )
      setRelatedArtwork((prev) =>
        prev.map((artworkItem) =>
          artworkItem._id === item._id
            ? { ...artworkItem, Likes: nextLikes }
            : artworkItem,
        ),
      )
    } catch (requestError) {
      if (syncedAccountLike) {
        try {
          const revertedUser = await setCurrentUserArtworkLike(authToken, item._id, true)
          onAuthUserUpdate(revertedUser)
        } catch {
          // The UI falls back to the refreshed account state if the rollback also fails.
        }
      }

      setLikedActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to remove this artwork from your liked items right now.',
      )
    } finally {
      setPendingLikedArtworkIds((prev) => {
        const next = new Set(prev)
        next.delete(item._id)
        return next
      })
    }
  }

  // Remove a liked artist from the signed-in account and keep the shared count in sync.
  const handleUnlikeArtist = async (artist: LikedArtist) => {
    if (!authToken || !user) {
      setLikedActionError('You must be signed in to update your liked artists.')
      return
    }

    setLikedActionError('')
    setPendingLikedArtistIds((prev) => {
      const next = new Set(prev)
      next.add(artist._id)
      return next
    })

    const currentLikes = Math.max(0, Number(artist.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes - 1)
    let syncedAccountLike = false

    try {
      const updatedUser = await setCurrentUserArtistLike(authToken, artist._id, false)
      onAuthUserUpdate(updatedUser)
      syncedAccountLike = true

      const response = await fetch(`/api/artists/${artist._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Likes: nextLikes }),
      })

      if (!response.ok) {
        throw new Error('Failed to update artist like count.')
      }

      setLikedArtists((prev) => prev.filter((likedArtist) => likedArtist._id !== artist._id))
      setSelectedArtist((prev) => (prev && prev._id === artist._id ? null : prev))
    } catch (requestError) {
      if (syncedAccountLike) {
        try {
          const revertedUser = await setCurrentUserArtistLike(authToken, artist._id, true)
          onAuthUserUpdate(revertedUser)
        } catch {
          // The UI falls back to the refreshed account state if the rollback also fails.
        }
      }

      setLikedActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to remove this artist from your liked items right now.',
      )
    } finally {
      setPendingLikedArtistIds((prev) => {
        const next = new Set(prev)
        next.delete(artist._id)
        return next
      })
    }
  }

  // Submit profile changes for the signed-in user and refresh the top-level auth state.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!authToken || !user) {
      setFormError('You must be signed in to update your account.')
      return
    }

    if (password && password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      const payload: { email: string; displayName: string; password?: string } = {
        email: email.trim(),
        displayName: displayName.trim(),
      }

      if (password.trim().length > 0) {
        payload.password = password
      }

      const response = await updateCurrentUser(authToken, payload)
      onAuthSuccess(response)
      setIsEditing(false)
      setPassword('')
      setConfirmPassword('')
      setFormSuccess('Account details updated successfully.')
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update your account right now.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Permanently delete the signed-in account after a browser confirmation step.
  const handleDeleteAccount = async () => {
    if (!authToken || !user) {
      return
    }

    const confirmed = window.confirm(
      `Delete the account for ${user.email}? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setDeleteSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      await deleteCurrentUser(authToken)
      onAccountDeleted()
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to delete your account right now.'
      )
      setDeleteSubmitting(false)
    }
  }

  // Enable inline editing for the profile section.
  const handleStartEditing = () => {
    if (!user) {
      return
    }

    setDisplayName(user.displayName || '')
    setEmail(user.email)
    setPassword('')
    setConfirmPassword('')
    setFormError('')
    setFormSuccess('')
    setIsEditing(true)
  }

  // Restore the saved account values and leave edit mode.
  const handleCancelEditing = () => {
    if (!user) {
      return
    }

    setDisplayName(user.displayName || '')
    setEmail(user.email)
    setPassword('')
    setConfirmPassword('')
    setFormError('')
    setFormSuccess('')
    setIsEditing(false)
  }

  // Keep the related-artwork carousel paging in sync with the current artist results.
  const relatedCarouselMaxPage = Math.max(
    0,
    Math.ceil(relatedArtwork.length / CAROUSEL_PAGE_SIZE) - 1,
  )
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

  if (!user) {
    return (
      <section className="account-page">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">
          Sign in to view your saved likes and account details.
        </p>
        <div className="auth-panel account-panel">
          <p className="status-text">You are currently logged out.</p>
          <div className="auth-footer">
            <a href="#/login" className="modal-link">
              Go to login
            </a>
            <a href="#/register" className="modal-link">
              Create an account
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="account-page">
      <h1 className="page-title">Account Settings</h1>
      <p className="page-subtitle">
        Review your profile, update your account, and revisit the artwork and
        artists you have liked.
      </p>

      <div className="account-grid">
        <section className="modal-section account-panel">
          <h2 className="modal-section-title">Profile</h2>
          <form className="auth-form account-form" onSubmit={handleSubmit}>
            <div className="modal-info-grid">
              <label className="modal-info-row account-edit-row">
                <span className="modal-info-label">Display Name</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="auth-input"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="How you want your name shown"
                    autoComplete="name"
                  />
                ) : (
                  <span className="modal-info-value">
                    {user.displayName?.trim() || 'No display name set'}
                  </span>
                )}
              </label>
              <label className="modal-info-row account-edit-row">
                <span className="modal-info-label">Email</span>
                {isEditing ? (
                  <input
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                ) : (
                  <span className="modal-info-value">{user.email}</span>
                )}
              </label>
              <div className="modal-info-row">
                <span className="modal-info-label">Joined</span>
                <span className="modal-info-value">{formatDate(user.createdAt)}</span>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-label">Last Updated</span>
                <span className="modal-info-value">{formatDate(user.updatedAt)}</span>
              </div>
              {isEditing ? (
                <>
                  <label className="modal-info-row account-edit-row">
                    <span className="modal-info-label">New Password</span>
                    <input
                      type="password"
                      className="auth-input"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Leave blank to keep current password"
                      autoComplete="new-password"
                      minLength={8}
                    />
                  </label>
                  <label className="modal-info-row account-edit-row">
                    <span className="modal-info-label">Confirm Password</span>
                    <input
                      type="password"
                      className="auth-input"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat the new password"
                      autoComplete="new-password"
                      minLength={8}
                    />
                  </label>
                </>
              ) : null}
            </div>

            {formError ? <p className="auth-error">{formError}</p> : null}
            {formSuccess ? <p className="account-success">{formSuccess}</p> : null}

            <div className="account-profile-actions">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="detail-action-btn"
                    onClick={handleCancelEditing}
                    disabled={submitting}
                  >
                    Cancel Changes
                  </button>
                  <button
                    type="submit"
                    className="detail-action-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="detail-action-btn"
                  onClick={handleStartEditing}
                >
                  Edit Account
                </button>
              )}
              <button
                type="button"
                className="detail-action-btn detail-action-btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteSubmitting || submitting}
              >
                {deleteSubmitting ? 'Deleting Account...' : 'Delete Account'}
              </button>
            </div>
          </form>
        </section>

        <section className="modal-section account-panel">
          <h2 className="modal-section-title">Saved Likes</h2>
          <div className="modal-info-grid">
            <div className="modal-info-row">
              <span className="modal-info-label">Liked Artists</span>
              <span className="modal-info-value">{user.likedArtistIds.length}</span>
            </div>
            <div className="modal-info-row">
              <span className="modal-info-label">Liked Artwork</span>
              <span className="modal-info-value">{user.likedArtworkIds.length}</span>
            </div>
          </div>
          <p className="modal-bio">
            These carousels are populated from the likes saved directly to your
            account profile.
          </p>
          {likedActionError ? <p className="auth-error">{likedActionError}</p> : null}
        </section>
      </div>

      <CollectionCarouselSection
        title="Liked Artwork"
        subtitle="The artwork currently saved to your signed-in profile."
        hasItems={likedArtwork.length > 0}
        status={
          likedLoading ? (
            <p className="status-text">Loading liked artwork...</p>
          ) : likedError ? (
            <p className="status-text">Error: {likedError}</p>
          ) : likedArtwork.length === 0 ? (
            <p className="status-text">No liked artwork saved to this account yet.</p>
          ) : undefined
        }
      >
        {likedArtwork.map((item) => {
          const isPending = pendingLikedArtworkIds.has(item._id)

          return (
            <ArtworkCarouselCard
              key={item._id}
              artwork={item}
              metaText={item.Date || item.Medium || 'Unknown date'}
              onOpen={openArtworkDetails}
              actionButton={
                <button
                  type="button"
                  className="card-heart-btn liked"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleUnlikeArtwork(item)
                  }}
                  aria-label={`Unlike ${item.Title || 'artwork'}`}
                  title={isPending ? 'Removing from liked artwork' : 'Unlike artwork'}
                  disabled={isPending}
                >
                  {'\u2665'}
                </button>
              }
            />
          )
        })}
      </CollectionCarouselSection>

      <CollectionCarouselSection
        title="Liked Artists"
        subtitle="The artists currently saved to your signed-in profile."
        hasItems={likedArtists.length > 0}
        status={
          likedLoading ? (
            <p className="status-text">Loading liked artists...</p>
          ) : likedError ? (
            <p className="status-text">Error: {likedError}</p>
          ) : likedArtists.length === 0 ? (
            <p className="status-text">No liked artists saved to this account yet.</p>
          ) : undefined
        }
      >
        {likedArtists.map((artist) => {
          const bioText =
            typeof artist.ArtistBio === 'string' ? artist.ArtistBio.trim() : ''
          const isPending = pendingLikedArtistIds.has(artist._id)

          return (
            <ArtistCarouselCard
              key={artist._id}
              artist={artist}
              metaText={getArtistCarouselMeta(artist)}
              bioText={bioText || 'No biography available for this artist.'}
              onOpen={openArtistDetails}
              actionButton={
                <button
                  type="button"
                  className="card-heart-btn liked"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleUnlikeArtist(artist)
                  }}
                  aria-label={`Unlike ${artist.DisplayName || 'artist'}`}
                  title={isPending ? 'Removing from liked artists' : 'Unlike artist'}
                  disabled={isPending}
                >
                  {'\u2665'}
                </button>
              }
              titleFallback="Unknown Artist"
            />
          )
        })}
      </CollectionCarouselSection>

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
          />
        ) : (
          selectedArtist && (
            <ArtistDetailsContent
              artist={selectedArtist}
              extraFields={extraArtistFields}
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
            />
          )
        )}
      </DetailsModal>
    </section>
  )
}

export default AccountSettingsPage
