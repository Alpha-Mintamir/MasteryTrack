import { useEffect, useState } from 'react'
import type { ReflectionInput } from '../types'

type Props = {
  open: boolean
  sessionId?: number | null
  onSkip: () => void
  onSubmit: (reflection: ReflectionInput) => Promise<void>
}

export const ReflectionDialog = ({ open, sessionId, onSkip, onSubmit }: Props) => {
  const [form, setForm] = useState<ReflectionInput>({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm({})
    }
  }, [open])

  if (!open || !sessionId) return null

  const updateField = (field: keyof ReflectionInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    await onSubmit(form)
    setPending(false)
    setForm({})
  }

  return (
    <div className="modal-backdrop" onClick={onSkip}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Reflection (optional)</h3>
          <p className="muted">Capture what you practiced to solidify learning.</p>
        </header>
        <form className="grid" onSubmit={handleSubmit}>
          <label>
            What did you practice?
            <textarea
              rows={2}
              value={form.practiced ?? ''}
              onChange={(e) => updateField('practiced', e.target.value)}
            />
          </label>
          <label>
            What did you learn?
            <textarea
              rows={2}
              value={form.learned ?? ''}
              onChange={(e) => updateField('learned', e.target.value)}
            />
          </label>
          <label>
            What will you do next time?
            <textarea
              rows={2}
              value={form.next_focus ?? ''}
              onChange={(e) => updateField('next_focus', e.target.value)}
            />
          </label>
          <label>
            Notes
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onSkip}>
              Skip
            </button>
            <button type="submit" className="primary" disabled={pending}>
              {pending ? 'Saving…' : 'Save reflection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
