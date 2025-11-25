import { useEffect, useState } from 'react'
import type { SessionEditPayload, SessionRecord } from '../types'

type Props = {
  session: SessionRecord | null
  onClose: () => void
  onSave: (payload: SessionEditPayload) => Promise<void>
}

const toLocalInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export const SessionEditor = ({ session, onClose, onSave }: Props) => {
  const [form, setForm] = useState<SessionEditPayload | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (session) {
      setForm({
        id: session.id,
        start_time: toLocalInput(session.start_time),
        end_time: toLocalInput(session.end_time ?? session.start_time),
        notes: session.notes ?? '',
        reflection_practice: session.reflection_practice ?? '',
        reflection_learning: session.reflection_learning ?? '',
        reflection_next: session.reflection_next ?? '',
      })
    } else {
      setForm(null)
    }
  }, [session])

  if (!form) return null

  const updateField = (field: keyof SessionEditPayload, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    await onSave({
      ...form,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
    })
    setPending(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Edit session</h3>
        </header>
        <form className="grid" onSubmit={handleSubmit}>
          <label>
            Start time
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => updateField('start_time', e.target.value)}
              required
            />
          </label>
          <label>
            End time
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => updateField('end_time', e.target.value)}
              required
            />
          </label>
          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </label>
          <div className="grid three">
            <label>
              Practiced
              <textarea
                rows={2}
                value={form.reflection_practice ?? ''}
                onChange={(e) => updateField('reflection_practice', e.target.value)}
              />
            </label>
            <label>
              Learned
              <textarea
                rows={2}
                value={form.reflection_learning ?? ''}
                onChange={(e) => updateField('reflection_learning', e.target.value)}
              />
            </label>
            <label>
              Next
              <textarea
                rows={2}
                value={form.reflection_next ?? ''}
                onChange={(e) => updateField('reflection_next', e.target.value)}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
