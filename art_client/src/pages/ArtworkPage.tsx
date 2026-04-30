import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  ARTWORK_DETAIL_HIDDEN_FIELDS,
  ArtworkDetailsContent,
  getArtistLabel,
} from '../components/CollectionDetailContent'
import CrudFormModal, { type CrudFormField } from '../components/CrudFormModal'
import DetailsModal from '../components/DetailsModal'
import type { AuthUser } from '../types/auth'
import { redirectToLoginWithNotice, setCurrentUserArtworkLike } from '../utils/auth'

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

type ArtworkFormValues = {
  Title: string
  Artist: string
  Date: string
  Medium: string
  Classification: string
  Department: string
  Dimensions: string
  AccessionNumber: string
  ObjectID: string
  URL: string
  ImageURL: string
  OnView: string
  CreditLine: string
}

const ARTWORK_FORM_FIELDS: CrudFormField[] = [
  { name: 'Title', label: 'Title', required: true, placeholder: 'Artwork title' },
  { name: 'Artist', label: 'Artist', placeholder: 'Artist name' },
  { name: 'Date', label: 'Date', placeholder: '1962' },
  { name: 'Medium', label: 'Medium', placeholder: 'Oil on canvas' },
  {
    name: 'Classification',
    label: 'Classification',
    placeholder: 'Painting',
  },
  { name: 'Department', label: 'Department', placeholder: 'Painting & Sculpture' },
  { name: 'Dimensions', label: 'Dimensions', placeholder: '50 x 70 cm' },
  {
    name: 'AccessionNumber',
    label: 'Accession Number',
    placeholder: '2026.1',
  },
  { name: 'ObjectID', label: 'Object ID', type: 'number', placeholder: '100001' },
  { name: 'URL', label: 'Artwork URL', type: 'url', placeholder: 'https://example.com' },
  {
    name: 'ImageURL',
    label: 'Image URL',
    type: 'url',
    placeholder: 'https://example.com/image.jpg',
  },
  { name: 'OnView', label: 'On View', placeholder: 'Yes / No' },
  {
    name: 'CreditLine',
    label: 'Credit Line',
    type: 'textarea',
    rows: 4,
    placeholder: 'Gift of...',
  },
]

const EMPTY_ARTWORK_FORM_VALUES: ArtworkFormValues = {
  Title: '',
  Artist: '',
  Date: '',
  Medium: '',
  Classification: '',
  Department: '',
  Dimensions: '',
  AccessionNumber: '',
  ObjectID: '',
  URL: '',
  ImageURL: '',
  OnView: '',
  CreditLine: '',
}

// Normalize text-like values for text inputs in the artwork form.
function getTextInputValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}

// Normalize numeric values for number inputs in the artwork form.
function getNumberInputValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string') {
    return value
  }
  return ''
}

// Convert a selected artwork record into the editable artwork form shape.
function getArtworkFormValues(item: Artwork | null): ArtworkFormValues {
  if (!item) {
    return { ...EMPTY_ARTWORK_FORM_VALUES }
  }

  return {
    Title: getTextInputValue(item.Title),
    Artist: getTextInputValue(item.Artist),
    Date: getTextInputValue(item.Date),
    Medium: getTextInputValue(item.Medium),
    Classification: getTextInputValue(item.Classification),
    Department: getTextInputValue(item.Department),
    Dimensions: getTextInputValue(item.Dimensions),
    AccessionNumber: getTextInputValue(item.AccessionNumber),
    ObjectID: getNumberInputValue(item.ObjectID),
    URL: getTextInputValue(item.URL),
    ImageURL: getTextInputValue(item.ImageURL),
    OnView: getTextInputValue(item.OnView),
    CreditLine: getTextInputValue(item.CreditLine),
  }
}

// Parse optional numeric form fields while keeping validation feedback user-friendly.
function parseOptionalNumberField(value: string, label: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  const parsedValue = Number(trimmedValue)
  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} must be a valid number.`)
  }

  return parsedValue
}

// Build the payload sent to the artwork API from the browser form values.
function buildArtworkPayload(values: ArtworkFormValues, isCreate: boolean) {
  const title = values.Title.trim()
  if (!title) {
    throw new Error('Artwork title is required.')
  }

  const payload: Record<string, unknown> = {
    Title: title,
    Artist: values.Artist
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
    Date: values.Date.trim(),
    Medium: values.Medium.trim(),
    Classification: values.Classification.trim(),
    Department: values.Department.trim(),
    Dimensions: values.Dimensions.trim(),
    AccessionNumber: values.AccessionNumber.trim(),
    ObjectID: parseOptionalNumberField(values.ObjectID, 'Object ID'),
    URL: values.URL.trim(),
    ImageURL: values.ImageURL.trim(),
    OnView: values.OnView.trim(),
    CreditLine: values.CreditLine.trim(),
  }

  if (isCreate) {
    payload.Likes = 0
  }

  return payload
}

// Normalize free-text values before applying browser-side search filters.
function normalizeSearchValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(', ').trim().toLowerCase()
  }
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

type ArtworkPageProps = {
  authToken: string | null
  authUser: AuthUser | null
  onAuthUserUpdate: (user: AuthUser) => void
}

// Render the main artwork collection page, including filters, CRUD actions, and detail flows.
function ArtworkPage({ authToken, authUser, onAuthUserUpdate }: ArtworkPageProps) {
  const [artwork, setArtwork] = useState<Artwork[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [likedArtworkIds, setLikedArtworkIds] = useState<Set<string>>(new Set())
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [artworkEditorMode, setArtworkEditorMode] = useState<'create' | 'edit' | null>(
    null
  )
  const [artworkEditorValues, setArtworkEditorValues] = useState<ArtworkFormValues>(
    EMPTY_ARTWORK_FORM_VALUES
  )
  const [artworkEditorError, setArtworkEditorError] = useState('')
  const [artworkEditorSubmitting, setArtworkEditorSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    // Load the artwork dataset used by the main collection page.
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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [dateFilter, departmentFilter, searchTerm])

  useEffect(() => {
    if (!authUser) {
      setLikedArtworkIds(new Set())
      return
    }

    setLikedArtworkIds(new Set(authUser.likedArtworkIds))
  }, [authUser])

  // Build the department filter options from the current dataset.
  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(
        artwork
          .map((item) => String(item.Department ?? '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [artwork])

  // Build the date filter options from the current dataset.
  const dateOptions = useMemo(() => {
    return Array.from(
      new Set(
        artwork
          .map((item) => String(item.Date ?? '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [artwork])

  // Apply browser-side search and dropdown filters before pagination.
  const filteredArtwork = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return artwork.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeSearchValue(item.Title).includes(normalizedSearch) ||
        normalizeSearchValue(item.Artist).includes(normalizedSearch) ||
        normalizeSearchValue(item.Medium).includes(normalizedSearch) ||
        normalizeSearchValue(item.Classification).includes(normalizedSearch)

      const matchesDepartment =
        departmentFilter.length === 0 ||
        String(item.Department ?? '').trim() === departmentFilter

      const matchesDate =
        dateFilter.length === 0 || String(item.Date ?? '').trim() === dateFilter

      return matchesSearch && matchesDepartment && matchesDate
    })
  }, [artwork, dateFilter, departmentFilter, searchTerm])

  const visibleArtwork = filteredArtwork.slice(0, visibleCount)
  const canShowMore = visibleCount < filteredArtwork.length

  // Redirect logged-out visitors to the login page before any protected action can run.
  const requireSignedIn = (message: string) => {
    if (!authToken || !authUser) {
      redirectToLoginWithNotice(message)
      return false
    }

    return true
  }

  // Close the artwork detail modal.
  const closeDetails = () => {
    setSelectedArtwork(null)
    setDetailsLoading(false)
  }

  // Reset and close the shared artwork create/edit modal.
  const closeArtworkEditor = () => {
    setArtworkEditorMode(null)
    setArtworkEditorValues({ ...EMPTY_ARTWORK_FORM_VALUES })
    setArtworkEditorError('')
    setArtworkEditorSubmitting(false)
  }

  // Open the artwork modal in create mode with empty defaults.
  const openCreateArtworkEditor = () => {
    if (!requireSignedIn('Please sign in to manage artwork.')) {
      return
    }

    setArtworkEditorMode('create')
    setArtworkEditorValues({ ...EMPTY_ARTWORK_FORM_VALUES })
    setArtworkEditorError('')
  }

  // Open the artwork modal in edit mode using the selected record.
  const openEditArtworkEditor = (item: Artwork) => {
    if (!requireSignedIn('Please sign in to manage artwork.')) {
      return
    }

    setArtworkEditorMode('edit')
    setArtworkEditorValues(getArtworkFormValues(item))
    setArtworkEditorError('')
  }

  // Send create or update requests for artwork records from the shared editor modal.
  const handleArtworkEditorSubmit = async (values: Record<string, string>) => {
    if (!requireSignedIn('Please sign in to manage artwork.')) {
      return
    }

    const isCreate = artworkEditorMode === 'create'
    const targetArtwork = isCreate ? null : selectedArtwork

    if (!isCreate && !targetArtwork) {
      setArtworkEditorError('Select an artwork item before trying to update it.')
      return
    }

    setArtworkEditorSubmitting(true)
    setArtworkEditorError('')

    try {
      const payload = buildArtworkPayload(values as ArtworkFormValues, isCreate)
      const response = await fetch(
        isCreate ? '/api/artwork' : `/api/artwork/${targetArtwork?._id}`,
        {
          method: isCreate ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        throw new Error(
          isCreate ? 'Failed to create artwork.' : 'Failed to update artwork.'
        )
      }

      const savedArtwork = (await response.json()) as Artwork

      if (isCreate) {
        setArtwork((prev) => [savedArtwork, ...prev])
      } else {
        setArtwork((prev) =>
          prev.map((item) => (item._id === savedArtwork._id ? savedArtwork : item))
        )
        setSelectedArtwork((prev) =>
          prev && prev._id === savedArtwork._id ? savedArtwork : prev
        )
      }

      closeArtworkEditor()
    } catch (submitError) {
      setArtworkEditorError(
        submitError instanceof Error ? submitError.message : 'Unable to save artwork.'
      )
    } finally {
      setArtworkEditorSubmitting(false)
    }
  }

  // Delete the selected artwork after a browser confirmation step.
  const handleDeleteArtwork = async () => {
    if (!requireSignedIn('Please sign in to manage artwork.')) {
      return
    }

    if (!selectedArtwork) {
      return
    }

    const confirmed = window.confirm(
      `Delete ${selectedArtwork.Title || 'this artwork'}? This cannot be undone.`
    )
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/artwork/${selectedArtwork._id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete artwork.')
      }

      setArtwork((prev) => prev.filter((item) => item._id !== selectedArtwork._id))
      setLikedArtworkIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedArtwork._id)
        return next
      })
      closeDetails()
    } catch {
      window.alert('Failed to delete artwork. Please try again.')
    }
  }

  // Load the full artwork record for the selected card.
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

  // Optimistically toggle likes for artwork and persist the new count through the API.
  const handleLike = async (event: MouseEvent<HTMLButtonElement>, item: Artwork) => {
    event.stopPropagation()
    if (!requireSignedIn('Please sign in to like items.')) {
      return
    }

    const isCurrentlyLiked = likedArtworkIds.has(item._id)
    const currentLikes = Math.max(0, Number(item.Likes ?? 0))
    const nextLikes = Math.max(0, currentLikes + (isCurrentlyLiked ? -1 : 1))
    const shouldLike = !isCurrentlyLiked

    setLikedArtworkIds((prev) => {
      const next = new Set(prev)
      if (shouldLike) {
        next.add(item._id)
      } else {
        next.delete(item._id)
      }
      return next
    })

    setArtwork((prev) =>
      prev.map((art) => (art._id === item._id ? { ...art, Likes: nextLikes } : art))
    )
    setSelectedArtwork((prev) =>
      prev && prev._id === item._id ? { ...prev, Likes: nextLikes } : prev
    )

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

      const updatedArtwork = (await response.json()) as Artwork
      setArtwork((prev) =>
        prev.map((art) => (art._id === item._id ? updatedArtwork : art))
      )
      setSelectedArtwork((prev) =>
        prev && prev._id === item._id ? updatedArtwork : prev
      )
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

      setLikedArtworkIds((prev) => {
        const next = new Set(prev)
        if (shouldLike) {
          next.delete(item._id)
        } else {
          next.add(item._id)
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
          if (ARTWORK_DETAIL_HIDDEN_FIELDS.has(key)) {
            return false
          }

          return value !== null && value !== undefined && value !== ''
        })
  const isSelectedArtworkLiked = selectedArtwork
    ? likedArtworkIds.has(selectedArtwork._id)
    : false

  return (
    <section className="collection-page">
      <div className="collection-header">
        <div>
          <h1 className="page-title collection-main-title">Artwork</h1>
          <p className="page-subtitle">
            Showing {visibleArtwork.length} out of {filteredArtwork.length} artworks
          </p>
        </div>
        <div className="collection-toolbar">
          <input
            type="search"
            className="collection-search-input"
            placeholder="Search artwork"
            aria-label="Search artwork"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="collection-filter-select"
            aria-label="Filter artwork by department"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="">All Departments</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="collection-filter-select"
            aria-label="Filter artwork by date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            <option value="">All Dates</option>
            {dateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="collection-header-actions">
            <button
              type="button"
              className="collection-action-btn"
              onClick={openCreateArtworkEditor}
              title={authUser ? 'Add artwork' : 'Sign in to add artwork'}
            >
              Add Artwork
            </button>
          </div>
        </div>
      </div>
      <div className="card-grid">
        {visibleArtwork.map((item) => {
          const isLiked = likedArtworkIds.has(item._id)
          const likeActionLabel = authUser
            ? `${isLiked ? 'Unlike' : 'Like'} ${item.Title || 'artwork'}`
            : `Sign in to like ${item.Title || 'artwork'}`

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
              aria-label={likeActionLabel}
              title={authUser ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
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
          <ArtworkDetailsContent
            artwork={selectedArtwork}
            extraFields={extraArtworkFields}
            isLiked={isSelectedArtworkLiked}
            onToggleLike={handleLike}
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
            toolbar={
              <div className="detail-toolbar">
                <button
                  type="button"
                  className="detail-action-btn"
                  onClick={() => openEditArtworkEditor(selectedArtwork)}
                  title={authUser ? 'Edit artwork' : 'Sign in to edit artwork'}
                >
                  Edit Artwork
                </button>
                <button
                  type="button"
                  className="detail-action-btn detail-action-btn-danger"
                  onClick={handleDeleteArtwork}
                  title={authUser ? 'Delete artwork' : 'Sign in to delete artwork'}
                >
                  Delete Artwork
                </button>
              </div>
            }
          />
        )}
      </DetailsModal>
      <CrudFormModal
        isOpen={artworkEditorMode !== null}
        title={artworkEditorMode === 'create' ? 'Add Artwork' : 'Edit Artwork'}
        submitLabel={artworkEditorMode === 'create' ? 'Create Artwork' : 'Save Changes'}
        fields={ARTWORK_FORM_FIELDS}
        initialValues={artworkEditorValues}
        error={artworkEditorError}
        submitting={artworkEditorSubmitting}
        onClose={closeArtworkEditor}
        onSubmit={handleArtworkEditorSubmit}
      />
    </section>
  )
}

export default ArtworkPage
