import type { AuthResponse, CurrentUserResponse } from '../types/auth'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

async function parseResponseJson<T>(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return (await response.json()) as T
}

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

export async function loginUser(input: { email: string; password: string }) {
  return requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
}

export async function getCurrentUser(token: string) {
  const response = await requestJson<CurrentUserResponse>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.user
}
