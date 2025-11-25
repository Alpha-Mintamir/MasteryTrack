import type { ReflectionInput } from '../types'

interface Props {
  open: boolean
  draft: ReflectionInput
  onChange: (draft: ReflectionInput) => void
  onSubmit: () => Promise<void>
  onClose: () => void
  saving: boolean
}

export const ReflectionModal = ({ open, draft, onChange, onSubmit, onClose, saving }: Props) => {
  if (!open) return null

  return (
    <div className="overlay">
      <div className="modal">
        <header>
          <h3>Reflection</h3>
          <p className="muted">Capture what you practiced before logging the session.</p>
        </header>
        <label>
          What did you practice?
          <textarea
            rows={2}
            value={draft.what_practiced ?? ''}
            onChange={(e) => onChange({ ...draft, what_practiced: e.target.value })}
          />
        </label>
        <label>
          What did you learn?
          <textarea
            rows={2}
            value={draft.what_learned ?? ''}
            onChange={(e) => onChange({ ...draft, what_learned: e.target.value })}
          />
        </label>
        <label>
          What will you focus on next?
          <textarea
            rows={2}
            value={draft.next_focus ?? ''}
            onChange={(e) => onChange({ ...draft, next_focus: e.target.value })}
          />
        </label>
        <label>
          Session notes (optional)
          <textarea
            rows={2}
            value={draft.notes ?? ''}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          />
        </label>
        <div className="actions-row">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" onClick={onSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </div>
  )
}
