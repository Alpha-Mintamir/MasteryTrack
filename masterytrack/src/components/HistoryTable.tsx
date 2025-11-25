import { useState } from 'react'
import dayjs from 'dayjs'
import type { SessionHistoryRow } from '../types'
import { formatDate, formatDateTime } from '../utils/time'

interface EditDraft {
  id: number
  start: string
  end?: string | null
  duration_minutes: number
  notes?: string | null
  what_practiced?: string | null
  what_learned?: string | null
  next_focus?: string | null
}

interface Props {
  sessions: SessionHistoryRow[]
  onSave: (draft: EditDraft) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export const HistoryTable = ({ sessions, onSave, onDelete }: Props) => {
  const [editing, setEditing] = useState<EditDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const handleEdit = (session: SessionHistoryRow) => {
    setEditing({
      id: session.id,
      start: dayjs(session.start).format('YYYY-MM-DDTHH:mm'),
      end: session.end ? dayjs(session.end).format('YYYY-MM-DDTHH:mm') : null,
      duration_minutes: session.duration_minutes,
      notes: session.notes ?? '',
      what_practiced: session.what_practiced ?? '',
      what_learned: session.what_learned ?? '',
      next_focus: session.next_focus ?? '',
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await onSave(editing)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card history-card">
      <header>
        <div>
          <h3>Session History</h3>
          <p className="muted">Edit or clean up past practice blocks.</p>
        </div>
      </header>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Duration</th>
              <th>Notes</th>
              <th>Reflection</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <span className="strong">{formatDate(session.start)}</span>
                  <span className="muted tiny">{formatDateTime(session.start)}</span>
                </td>
                <td>{(session.duration_minutes / 60).toFixed(2)}h</td>
                <td>{session.notes || '—'}</td>
                <td>
                  <div className="reflection-cell">
                    <strong>{session.what_practiced || '—'}</strong>
                    <span>{session.what_learned || '—'}</span>
                    <em>{session.next_focus || '—'}</em>
                  </div>
                </td>
                <td className="actions">
                  <button onClick={() => handleEdit(session)}>Edit</button>
                  <button className="ghost" onClick={() => onDelete(session.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="edit-panel">
          <div className="grid two">
            <label>
              Start
              <input
                type="datetime-local"
                value={editing.start}
                onChange={(e) => setEditing({ ...editing, start: e.target.value })}
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={editing.end ?? ''}
                onChange={(e) => setEditing({ ...editing, end: e.target.value })}
              />
            </label>
          </div>
          <label>
            Duration (minutes)
            <input
              type="number"
              min={1}
              value={editing.duration_minutes}
              onChange={(e) =>
                setEditing({ ...editing, duration_minutes: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Session Notes
            <textarea
              rows={2}
              value={editing.notes ?? ''}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            />
          </label>
          <div className="grid three">
            <label>
              Practiced
              <input
                value={editing.what_practiced ?? ''}
                onChange={(e) => setEditing({ ...editing, what_practiced: e.target.value })}
              />
            </label>
            <label>
              Learned
              <input
                value={editing.what_learned ?? ''}
                onChange={(e) => setEditing({ ...editing, what_learned: e.target.value })}
              />
            </label>
            <label>
              Next
              <input
                value={editing.next_focus ?? ''}
                onChange={(e) => setEditing({ ...editing, next_focus: e.target.value })}
              />
            </label>
          </div>
          <div className="actions-row">
            <button className="ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
