import { Pencil, Trash } from 'lucide-react'
import type { SessionRecord } from '../types'

type Props = {
  sessions: SessionRecord[]
  onEdit: (session: SessionRecord) => void
  onDelete: (session: SessionRecord) => void
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const HistoryTable = ({ sessions, onEdit, onDelete }: Props) => {
  return (
    <div className="card history-card">
      <header>
        <h3>Practice log</h3>
        <p className="muted">{sessions.length} recent sessions</p>
      </header>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{formatDate(session.start_time)}</td>
                <td>{formatTime(session.start_time)}</td>
                <td>{formatTime(session.end_time)}</td>
                <td>{(session.duration_minutes / 60).toFixed(2)} h</td>
                <td className="notes-cell">{session.notes ?? '—'}</td>
                <td className="actions">
                  <button onClick={() => onEdit(session)} title="Edit entry">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => onDelete(session)} title="Delete entry">
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
