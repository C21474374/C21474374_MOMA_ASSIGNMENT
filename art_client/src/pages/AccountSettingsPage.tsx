import type { AuthUser } from '../types/auth'

type AccountSettingsPageProps = {
  user: AuthUser | null
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

// Show the current account profile and like totals, or sign-in prompts when logged out.
function AccountSettingsPage({ user }: AccountSettingsPageProps) {
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
        Review the profile information attached to your account.
      </p>

      <div className="account-grid">
        <section className="modal-section">
          <h2 className="modal-section-title">Profile</h2>
          <div className="modal-info-grid">
            <div className="modal-info-row">
              <span className="modal-info-label">Display Name</span>
              <span className="modal-info-value">
                {user.displayName?.trim() || 'No display name set'}
              </span>
            </div>
            <div className="modal-info-row">
              <span className="modal-info-label">Email</span>
              <span className="modal-info-value">{user.email}</span>
            </div>
            <div className="modal-info-row">
              <span className="modal-info-label">Joined</span>
              <span className="modal-info-value">{formatDate(user.createdAt)}</span>
            </div>
            <div className="modal-info-row">
              <span className="modal-info-label">Last Updated</span>
              <span className="modal-info-value">{formatDate(user.updatedAt)}</span>
            </div>
          </div>
        </section>

        <section className="modal-section">
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
            Like syncing is ready for this account, so these counts will reflect the
            items we store against your profile.
          </p>
        </section>
      </div>
    </section>
  )
}

export default AccountSettingsPage
