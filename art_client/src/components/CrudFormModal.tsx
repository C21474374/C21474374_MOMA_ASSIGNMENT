import { type FormEvent, useEffect, useState } from 'react'

export type CrudFormField = {
  name: string
  label: string
  type?: 'text' | 'number' | 'url' | 'textarea'
  placeholder?: string
  required?: boolean
  rows?: number
}

type CrudFormModalProps = {
  isOpen: boolean
  title: string
  submitLabel: string
  fields: CrudFormField[]
  initialValues: Record<string, string>
  error?: string
  submitting?: boolean
  onClose: () => void
  onSubmit: (values: Record<string, string>) => void | Promise<void>
}

// Render a reusable modal form for create and edit flows on collection pages.
function CrudFormModal({
  isOpen,
  title,
  submitLabel,
  fields,
  initialValues,
  error = '',
  submitting = false,
  onClose,
  onSubmit,
}: CrudFormModalProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>(initialValues)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setFormValues(initialValues)
  }, [initialValues, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose, submitting])

  if (!isOpen) {
    return null
  }

  // Pass the current modal form state back to the parent page handler.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(formValues)
  }

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="modal-panel crud-modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-icon-btn modal-close"
              onClick={onClose}
              aria-label="Close form"
              title="Close"
              disabled={submitting}
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

        <form className="crud-form" onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            {fields.map((field) => {
              const value = formValues[field.name] ?? ''

              return (
                <label
                  className={`crud-field ${field.type === 'textarea' ? 'crud-field-full' : ''}`}
                  key={field.name}
                >
                  <span className="crud-label">{field.label}</span>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="crud-input crud-textarea"
                      value={value}
                      rows={field.rows ?? 5}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={submitting}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      className="crud-input"
                      type={field.type ?? 'text'}
                      value={value}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={submitting}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              )
            })}
          </div>

          {error ? <p className="crud-error">{error}</p> : null}

          <div className="crud-actions">
            <button
              type="button"
              className="crud-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="crud-btn crud-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CrudFormModal
