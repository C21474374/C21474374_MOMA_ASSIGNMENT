// Safe user shape returned to the frontend after auth endpoints succeed.
export type AuthUser = {
  _id: string
  email: string
  displayName?: string
  likedArtistIds: string[]
  likedArtworkIds: string[]
  createdAt?: string
  updatedAt?: string
}

// Auth endpoints return both the signed token and the safe user payload.
export type AuthResponse = {
  token: string
  user: AuthUser
}

// The current-user endpoint wraps the safe user payload in a top-level object.
export type CurrentUserResponse = {
  user: AuthUser
}
