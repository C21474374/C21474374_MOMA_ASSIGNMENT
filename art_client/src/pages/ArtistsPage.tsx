import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  ARTIST_DETAIL_HIDDEN_FIELDS,
  ARTWORK_DETAIL_HIDDEN_FIELDS,
  ArtistDetailsContent,
  ArtworkDetailsContent,
} from '../components/CollectionDetailContent'
import CrudFormModal, { type CrudFormField } from '../components/CrudFormModal'
import DetailsModal from '../components/DetailsModal'
import type { AuthUser } from '../types/auth'
import {
  redirectToLoginWithNotice,
  setCurrentUserArtistLike,
  setCurrentUserArtworkLike,
} from '../utils/auth'

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

type ArtistFormValues = {
  DisplayName: string
  ArtistBio: string
  Nationality: string
  Gender: string
  BeginDate: string
  EndDate: string
  ConstituentID: string
  ULAN: string
  'Wiki QID': string
}

const ARTIST_FORM_FIELDS: CrudFormField[] = [
  { name: 'DisplayName', label: 'Name', required: true, placeholder: 'Artist name' },
  {
    name: 'ArtistBio',
    label: 'Biography',
    type: 'textarea',
    rows: 5,
    placeholder: 'Short artist biography',
  },
  { name: 'Nationality', label: 'Nationality', placeholder: 'Irish' },
  { name: 'Gender', label: 'Gender', placeholder: 'Unknown' },
  { name: 'BeginDate', label: 'Birth Year', type: 'number', placeholder: '1900' },
  { name: 'EndDate', label: 'Death Year', type: 'number', placeholder: '1980' },
  {
    name: 'ConstituentID',
    label: 'Constituent ID',
    type: 'number',
    placeholder: '100001',
  },
  { name: 'ULAN', label: 'ULAN', placeholder: '500011051' },
  { name: 'Wiki QID', label: 'Wiki QID', placeholder: 'Q5582' },
]

const EMPTY_ARTIST_FORM_VALUES: ArtistFormValues = {
  DisplayName: '',
  ArtistBio: '',
  Nationality: '',
  Gender: '',
  BeginDate: '',
  EndDate: '',
  ConstituentID: '',
  ULAN: '',
  'Wiki QID': '',
}

// Normalize text-like values for text inputs in the artist form.
function getTextInputValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}

// Normalize numeric values for number inputs in the artist form.
function getNumberInputValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string') {
    return value
  }
  return ''
}

// Convert a selected artist record into the editable artist form shape.
function getArtistFormValues(artist: Artist | null): ArtistFormValues {
  if (!artist) {
    return { ...EMPTY_ARTIST_FORM_VALUES }
  }

  return {
    DisplayName: getTextInputValue(artist.DisplayName),
    ArtistBio: getTextInputValue(artist.ArtistBio),
    Nationality: getTextInputValue(artist.Nationality),
    Gender: getTextInputValue(artist.Gender),
    BeginDate: getNumberInputValue(artist.BeginDate),
    EndDate: getNumberInputValue(artist.EndDate),
    ConstituentID: getNumberInputValue(artist.ConstituentID),
    ULAN: getTextInputValue(artist.ULAN),
    'Wiki QID': getTextInputValue(artist['Wiki QID']),
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

// Build the payload sent to the artists API from the browser form values.
function buildArtistPayload(values: ArtistFormValues, isCreate: boolean) {
  const displayName = values.DisplayName.trim()
  if (!displayName) {
    throw new Error('Artist name is required.')
  }

  const payload: Record<string, unknown> = {
    DisplayName: displayName,
    ArtistBio: values.ArtistBio.trim(),
    Nationality: values.Nationality.trim(),
    Gender: values.Gender.trim(),
    BeginDate: parseOptionalNumberField(values.BeginDate, 'Birth year'),
    EndDate: parseOptionalNumberField(values.EndDate, 'Death year'),
    ConstituentID: parseOptionalNumberField(values.ConstituentID, 'Constituent ID'),
    ULAN: values.ULAN.trim(),
    'Wiki QID': values['Wiki QID'].trim(),
  }

  if (isCreate) {
    payload.Likes = 0
  }

  return payload
}

// Normalize free-text values before applying browser-side search filters.
function normalizeSearchValue(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
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

type ArtistsPageProps = {
  authToken: string | null
  authUser: AuthUser | null
  onAuthUserUpdate: (user: AuthUser) => void
}

// Render the main artists collection page, including filters, CRUD actions, and detail flows.
function ArtistsPage({ authToken, authUser, onAuthUserUpdate }: ArtistsPageProps) {
  const [artists, setArtists] = useState<Artist[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [searchTerm, setSearchTerm] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
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
  const [artistEditorMode, setArtistEditorMode] = useState<'create' | 'edit' | null>(
    null
  )
  const [artistEditorValues, setArtistEditorValues] = useState<ArtistFormValues>(
    EMPTY_ARTIST_FORM_VALUES
  )
  const [artistEditorError, setArtistEditorError] = useState('')
  const [artistEditorSubmitting, setArtistEditorSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    // Load the artist dataset used by the main collection page.
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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchTerm, nationalityFilter, genderFilter])

  useEffect(() => {
    if (!authUser) {
      setLikedArtistIds(new Set())
      setLikedRelatedArtworkIds(new Set())
      return
    }

    setLikedArtistIds(new Set(authUser.likedArtistIds))
    setLikedRelatedArtworkIds(new Set(authUser.likedArtworkIds))
  }, [authUser])

  // Build the nationality filter options from the current dataset.
  const nationalityOptions = useMemo(() => {
    return Array.from(
      new Set(
        artists
          .map((artist) => String(artist.Nationality ?? '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [artists])

  // Build the gender filter options from the current dataset.
  const genderOptions = useMemo(() => {
    return Array.from(
      new Set(
        artists
          .map((artist) => String(artist.Gender ?? '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [artists])

  // Apply browser-side search and dropdown filters before pagination.
  const filteredArtists = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return artists.filter((artist) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeSearchValue(artist.DisplayName).includes(normalizedSearch) ||
        normalizeSearchValue(artist.ArtistBio).includes(normalizedSearch) ||
        normalizeSearchValue(artist.Nationality).includes(normalizedSearch)

      const matchesNationality =
        nationalityFilter.length === 0 ||
        String(artist.Nationality ?? '').trim() === nationalityFilter

      const matchesGender =
        genderFilter.length === 0 || String(artist.Gender ?? '').trim() === genderFilter

      return matchesSearch && matchesNationality && matchesGender
    })
  }, [artists, genderFilter, nationalityFilter, searchTerm])

  const visibleArtists = filteredArtists.slice(0, visibleCount)
  const canShowMore = visibleCount < filteredArtists.length

  // Redirect logged-out visitors to the login page before any like mutation can run.
  const requireSignedInForLike = () => {
    if (!authToken || !authUser) {
      redirectToLoginWithNotice('Please sign in to like items.')
      return false
    }

    return true
  }

  // Close the artist detail flow and clear related artwork state.
  const closeDetails = () => {
    setSelectedArtist(null)
    setSelectedRelatedArtwork(null)
    setDetailsLoading(false)
    setRelatedLoading(false)
    setRelatedDetailsLoading(false)
    setRelatedArtwork([])
    setCarouselPage(0)
  }

  // Reset and close the shared artist create/edit modal.
  const closeArtistEditor = () => {
    setArtistEditorMode(null)
    setArtistEditorValues({ ...EMPTY_ARTIST_FORM_VALUES })
    setArtistEditorError('')
    setArtistEditorSubmitting(false)
  }

  // Open the artist modal in create mode with empty defaults.
  const openCreateArtistEditor = () => {
    setArtistEditorMode('create')
    setArtistEditorValues({ ...EMPTY_ARTIST_FORM_VALUES })
    setArtistEditorError('')
  }

  // Open the artist modal in edit mode using the selected record.
  const openEditArtistEditor = (artist: Artist) => {
    setArtistEditorMode('edit')
    setArtistEditorValues(getArtistFormValues(artist))
    setArtistEditorError('')
  }

  // Send create or update requests for artist records from the shared editor modal.
  const handleArtistEditorSubmit = async (values: Record<string, string>) => {
    const isCreate = artistEditorMode === 'create'
    const targetArtist = isCreate ? null : selectedArtist

    if (!isCreate && !targetArtist) {
      setArtistEditorError('Select an artist before trying to update it.')
      return
    }

    setArtistEditorSubmitting(true)
    setArtistEditorError('')

    try {
      const payload = buildArtistPayload(values as ArtistFormValues, isCreate)
      const response = await fetch(
        isCreate ? '/api/artists' : `/api/artists/${targetArtist?._id}`,
        {
          method: isCreate ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        throw new Error(
          isCreate ? 'Failed to create artist.' : 'Failed to update artist.'
        )
      }

      const savedArtist = (await response.json()) as Artist

      if (isCreate) {
        setArtists((prev) => [savedArtist, ...prev])
      } else {
        setArtists((prev) =>
          prev.map((artist) => (artist._id === savedArtist._id ? savedArtist : artist))
        )
        setSelectedArtist((prev) =>
          prev && prev._id === savedArtist._id ? savedArtist : prev
        )
      }

      closeArtistEditor()
    } catch (submitError) {
      setArtistEditorError(
        submitError instanceof Error ? submitError.message : 'Unable to save artist.'
      )
    } finally {
      setArtistEditorSubmitting(false)
    }
  }

  // Delete the selected artist after a browser confirmation step.
  const handleDeleteArtist = async () => {
    if (!selectedArtist) {
      return
    }

    const confirmed = window.confirm(
      `Delete ${selectedArtist.DisplayName || 'this artist'}? This cannot be undone.`
    )
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/artists/${selectedArtist._id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete artist.')
      }

      setArtists((prev) => prev.filter((artist) => artist._id !== selectedArtist._id))
      setLikedArtistIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedArtist._id)
        return next
      })
      closeDetails()
    } catch {
      window.alert('Failed to delete artist. Please try again.')
    }
  }

  // Load the full artist record and related artwork for the selected card.
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

  // Return from a nested related-artwork detail view back to the parent artist modal.
  const goBackToArtistDetails = () => {
    setSelectedRelatedArtwork(null)
    setRelatedDetailsLoading(false)
  }

  // Optimistically toggle likes for an artist and persist the new count through the API.
  const handleLike = async (event: MouseEvent<HTMLButtonElement>, artist: Artist) => {
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

    setArtists((prev) =>
      prev.map((item) =>
        item._id === artist._id ? { ...item, Likes: nextLikes } : item
      )
    )
    setSelectedArtist((prev) =>
      prev && prev._id === artist._id ? { ...prev, Likes: nextLikes } : prev
    )

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
      setArtists((prev) =>
        prev.map((item) => (item._id === artist._id ? updatedArtist : item))
      )
      setSelectedArtist((prev) =>
        prev && prev._id === artist._id ? updatedArtist : prev
      )
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

  // Optimistically toggle likes for artwork displayed inside the artist detail flow.
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

    setLikedRelatedArtworkIds((prev) => {
      const next = new Set(prev)
      if (shouldLike) {
        next.add(item._id)
      } else {
        next.delete(item._id)
      }
      return next
    })

    setRelatedArtwork((prev) =>
      prev.map((art) => (art._id === item._id ? { ...art, Likes: nextLikes } : art))
    )
    setSelectedRelatedArtwork((prev) =>
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

      const updatedArtwork = (await response.json()) as ArtworkSummary
      setRelatedArtwork((prev) =>
        prev.map((art) => (art._id === item._id ? updatedArtwork : art))
      )
      setSelectedRelatedArtwork((prev) =>
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

      setLikedRelatedArtworkIds((prev) => {
        const next = new Set(prev)
        if (shouldLike) {
          next.delete(item._id)
        } else {
          next.add(item._id)
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

  // Keep the related-artwork carousel paging in sync with the current results.
  const carouselMaxPage = useMemo(() => {
    if (relatedArtwork.length === 0) {
      return 0
    }
    return Math.ceil(relatedArtwork.length / CAROUSEL_PAGE_SIZE) - 1
  }, [relatedArtwork.length])

  // Slice the current page of related artwork for the artist modal carousel.
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
          if (ARTIST_DETAIL_HIDDEN_FIELDS.has(key)) {
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
  const isSelectedArtistLiked = selectedArtist
    ? likedArtistIds.has(selectedArtist._id)
    : false
  const isSelectedRelatedArtworkLiked = selectedRelatedArtwork
    ? likedRelatedArtworkIds.has(selectedRelatedArtwork._id)
    : false

  return (
    <section className="collection-page">
      <div className="collection-header">
        <div>
          <h1 className="page-title collection-main-title">Artists</h1>
          <p className="page-subtitle">
            Showing {visibleArtists.length} out of {filteredArtists.length} artists
          </p>
        </div>
        <div className="collection-toolbar">
          <input
            type="search"
            className="collection-search-input"
            placeholder="Search artists"
            aria-label="Search artists"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="collection-filter-select"
            aria-label="Filter artists by nationality"
            value={nationalityFilter}
            onChange={(event) => setNationalityFilter(event.target.value)}
          >
            <option value="">All Nationalities</option>
            {nationalityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="collection-filter-select"
            aria-label="Filter artists by gender"
            value={genderFilter}
            onChange={(event) => setGenderFilter(event.target.value)}
          >
            <option value="">All Genders</option>
            {genderOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="collection-header-actions">
            <button
              type="button"
              className="collection-action-btn"
              onClick={openCreateArtistEditor}
            >
              Add Artist
            </button>
          </div>
        </div>
      </div>
      <div className="card-grid">
        {visibleArtists.map((artist) => {
          const isLiked = likedArtistIds.has(artist._id)
          const likeActionLabel = authUser
            ? `${isLiked ? 'Unlike' : 'Like'} ${artist.DisplayName || 'artist'}`
            : `Sign in to like ${artist.DisplayName || 'artist'}`
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
        title={selectedRelatedArtwork?.Title || selectedArtist?.DisplayName || 'Artist'}
        item={selectedRelatedArtwork || selectedArtist}
        loading={selectedRelatedArtwork ? relatedDetailsLoading : detailsLoading}
        onBack={selectedRelatedArtwork ? goBackToArtistDetails : undefined}
        backLabel="Back to artist"
        onClose={closeDetails}
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
              onToggleLike={handleLike}
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
              relatedArtworkItems={carouselItems}
              relatedLoading={relatedLoading}
              relatedCarouselPage={carouselPage}
              relatedCarouselMaxPage={carouselMaxPage}
              onPreviousRelatedPage={() =>
                setCarouselPage((prev) => Math.max(0, prev - 1))
              }
              onNextRelatedPage={() =>
                setCarouselPage((prev) => Math.min(carouselMaxPage, prev + 1))
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
                      authUser ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'
                    }
                  >
                    {isLiked ? '\u2665' : '\u2661'}
                  </button>
                )
              }}
              toolbar={
                <div className="detail-toolbar">
                  <button
                    type="button"
                    className="detail-action-btn"
                    onClick={() => openEditArtistEditor(selectedArtist)}
                  >
                    Edit Artist
                  </button>
                  <button
                    type="button"
                    className="detail-action-btn detail-action-btn-danger"
                    onClick={handleDeleteArtist}
                  >
                    Delete Artist
                  </button>
                </div>
              }
            />
          )
        )}
      </DetailsModal>
      <CrudFormModal
        isOpen={artistEditorMode !== null}
        title={artistEditorMode === 'create' ? 'Add Artist' : 'Edit Artist'}
        submitLabel={artistEditorMode === 'create' ? 'Create Artist' : 'Save Changes'}
        fields={ARTIST_FORM_FIELDS}
        initialValues={artistEditorValues}
        error={artistEditorError}
        submitting={artistEditorSubmitting}
        onClose={closeArtistEditor}
        onSubmit={handleArtistEditorSubmit}
      />
    </section>
  )
}

export default ArtistsPage
