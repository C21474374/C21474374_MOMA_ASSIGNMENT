export type AuthUser = {
  _id: string
  email: string
  displayName?: string
  likedArtistIds: string[]
  likedArtworkIds: string[]
  createdAt?: string
  updatedAt?: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type CurrentUserResponse = {
  user: AuthUser
}
