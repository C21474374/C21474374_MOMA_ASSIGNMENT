import { type ReactNode, useEffect } from 'react'

type DetailsModalProps = {
  title: string
  item: Record<string, unknown> | null
  loading?: boolean
  onBack?: () => void
  backLabel?: string
  children?: ReactNode
  onClose: () => void
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    return value
      .map((entry) =>
        typeof entry === 'object' && entry !== null
          ? JSON.stringify(entry)
          : String(entry)
      )
      .join(', ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function DetailsModal({
  title,
  item,
  loading = false,
  onBack,
  backLabel = 'Back',
  children,
  onClose,
}: DetailsModalProps) {
  useEffect(() => {
    if (!item) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [item, onClose])

  if (!item) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} details`}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <div className="modal-actions">
            {onBack && (
              <button
                type="button"
                className="modal-icon-btn modal-back"
                onClick={onBack}
                aria-label={backLabel}
                title={backLabel}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="modal-icon"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M14.5 5.5L8 12l6.5 6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="modal-icon-btn modal-close"
              onClick={onClose}
              aria-label="Close details"
              title="Close"
            >
              <svg
                viewBox="0 0 24 24"
                className="modal-icon"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
        {loading ? (
          <p className="modal-status">Loading full details...</p>
        ) : children ? (
          children
        ) : (
          <div className="details-list">
            {Object.entries(item).map(([key, value]) => (
              <div className="details-row" key={key}>
                <div className="details-key">{key}</div>
                <div className="details-value">{formatValue(value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DetailsModal
