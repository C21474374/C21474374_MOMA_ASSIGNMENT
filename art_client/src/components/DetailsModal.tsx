import { type ReactNode, useEffect } from 'react'

type DetailsModalProps = {
  title: string
  item: Record<string, unknown> | null
  loading?: boolean
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
          <button type="button" className="modal-close" onClick={onClose}>
            Close
          </button>
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
