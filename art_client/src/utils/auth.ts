import type { AuthResponse, CurrentUserResponse } from '../types/auth'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}
const AUTH_REDIRECT_NOTICE_KEY = 'authRedirectNotice'

function getAuthorizedJsonHeaders(token: string) {
  return {
    ...JSON_HEADERS,
    Authorization: `Bearer ${token}`,
  }
}

// Safely parse JSON only when the server actually returned a JSON payload.
async function parseResponseJson<T>(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return (await response.json()) as T
}

// Wrap fetch so auth requests share the same JSON parsing and error handling rules.
async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init)
  const payload = await parseResponseJson<{ error?: string } & T>(response)

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`)
  }

  if (payload === null) {
    throw new Error('Expected a JSON response from the server')
  }

  return payload as T
}

// Wrap fetch for endpoints that intentionally return no response body on success.
async function requestEmpty(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init)
  const payload = await parseResponseJson<{ error?: string }>(response)

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`)
  }
}

// Call the register endpoint and return the auth session payload.
export async function registerUser(input: {
  email: string
  password: string
  displayName: string
}) {
  return requestJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
}

// Call the login endpoint and return the auth session payload.
export async function loginUser(input: { email: string; password: string }) {
  return requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
}

// Resolve the currently logged-in user for an existing bearer token.
export async function getCurrentUser(token: string) {
  const response = await requestJson<CurrentUserResponse>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.user
}

// Update the current user profile and return the refreshed auth payload.
export async function updateCurrentUser(
  token: string,
  input: {
    email?: string
    displayName?: string
    password?: string
  },
) {
  return requestJson<AuthResponse>('/api/auth/me', {
    method: 'PUT',
    headers: getAuthorizedJsonHeaders(token),
    body: JSON.stringify(input),
  })
}

// Delete the currently authenticated account.
export async function deleteCurrentUser(token: string) {
  return requestEmpty('/api/auth/me', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Add or remove an artist id on the signed-in user's liked list.
export async function setCurrentUserArtistLike(
  token: string,
  artistId: string,
  shouldLike: boolean,
) {
  const response = await requestJson<CurrentUserResponse>(
    `/api/auth/me/likes/artists/${artistId}`,
    {
      method: shouldLike ? 'PUT' : 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  return response.user
}

// Add or remove an artwork id on the signed-in user's liked list.
export async function setCurrentUserArtworkLike(
  token: string,
  artworkId: string,
  shouldLike: boolean,
) {
  const response = await requestJson<CurrentUserResponse>(
    `/api/auth/me/likes/artwork/${artworkId}`,
    {
      method: shouldLike ? 'PUT' : 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  return response.user
}

// Store a one-time auth notice so the login page can explain why the redirect happened.
export function redirectToLoginWithNotice(message: string) {
  sessionStorage.setItem(AUTH_REDIRECT_NOTICE_KEY, message)
  window.location.hash = '/login'
}

// Read and clear the last auth redirect notice after the login page loads.
export function consumeAuthRedirectNotice() {
  const notice = sessionStorage.getItem(AUTH_REDIRECT_NOTICE_KEY) || ''
  if (notice) {
    sessionStorage.removeItem(AUTH_REDIRECT_NOTICE_KEY)
  }

  return notice
}
