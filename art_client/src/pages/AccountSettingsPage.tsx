import { useEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import type { AuthResponse, AuthUser } from '../types/auth'
import { deleteCurrentUser, updateCurrentUser } from '../utils/auth'

type LikedArtist = {
  _id: string
  DisplayName?: string
  ArtistBio?: string
  Nationality?: string
  BeginDate?: number
  EndDate?: number
  Likes?: number
}

type LikedArtwork = {
  _id: string
  Title?: string
  Artist?: string[] | string
  Date?: string
  ImageURL?: string
  Medium?: string
  Likes?: number
}

type AccountSettingsPageProps = {
  authToken: string | null
  user: AuthUser | null
  onAuthSuccess: (response: AuthResponse) => void
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

// Turn the artwork artist field into a readable label for account liked-artwork cards.
function getArtistLabel(artist: LikedArtwork['Artist']) {
  if (Array.isArray(artist)) {
    return artist.filter(Boolean).join(', ')
  }

  if (typeof artist === 'string') {
    return artist
  }

  return 'Unknown artist'
}

// Build the short artist card meta line shown on the account liked-artists carousel.
function getArtistMeta(artist: LikedArtist) {
  const nationality = artist.Nationality || 'Unknown nationality'
  const start = artist.BeginDate ? String(artist.BeginDate) : ''
  const end = artist.EndDate ? String(artist.EndDate) : ''

  if (!start && !end) {
    return nationality
  }

  return `${nationality} - ${start || '?'}${end ? `-${end}` : ''}`
}

// Scroll a horizontal liked-items track by roughly one viewport at a time.
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
  const artworkTrackRef = useRef<HTMLDivElement | null>(null)
  const artistTrackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!user) {
      setDisplayName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setIsEditing(false)
      setFormError('')
      setFormSuccess('')
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
        return
      }

      if (user.likedArtistIds.length === 0 && user.likedArtworkIds.length === 0) {
        setLikedArtists([])
        setLikedArtwork([])
        setLikedError('')
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
        </section>
      </div>

      <section className="home-section account-liked-section">
        <div className="home-section-header">
          <div>
            <h2 className="page-title home-section-title">Liked Artwork</h2>
            <p className="page-subtitle home-section-subtitle">
              The artwork currently saved to your signed-in profile.
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

        {likedLoading ? (
          <p className="status-text">Loading liked artwork...</p>
        ) : likedError ? (
          <p className="status-text">Error: {likedError}</p>
        ) : likedArtwork.length === 0 ? (
          <p className="status-text">No liked artwork saved to this account yet.</p>
        ) : (
          <div className="home-carousel-track" ref={artworkTrackRef}>
            {likedArtwork.map((item) => (
              <article className="card home-carousel-card" key={item._id}>
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
                <p className="card-meta">{item.Date || item.Medium || 'Unknown date'}</p>
                <p className="card-likes">Likes: {item.Likes ?? 0}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="home-section account-liked-section">
        <div className="home-section-header">
          <div>
            <h2 className="page-title home-section-title">Liked Artists</h2>
            <p className="page-subtitle home-section-subtitle">
              The artists currently saved to your signed-in profile.
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

        {likedLoading ? (
          <p className="status-text">Loading liked artists...</p>
        ) : likedError ? null : likedArtists.length === 0 ? (
          <p className="status-text">No liked artists saved to this account yet.</p>
        ) : (
          <div className="home-carousel-track" ref={artistTrackRef}>
            {likedArtists.map((artist) => {
              const bioText =
                typeof artist.ArtistBio === 'string' ? artist.ArtistBio.trim() : ''

              return (
                <article
                  className="card home-carousel-card home-artist-card"
                  key={artist._id}
                >
                  <div className="home-artist-card-body">
                    <h3 className="card-title">{artist.DisplayName || 'Unknown Artist'}</h3>
                    <p className="card-meta">{getArtistMeta(artist)}</p>
                    <p className="home-artist-bio">
                      {bioText || 'No biography available for this artist.'}
                    </p>
                  </div>
                  <p className="card-likes">Likes: {artist.Likes ?? 0}</p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

export default AccountSettingsPage
