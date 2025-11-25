import type { DashboardStats, TimerStatus } from '../types'
import { formatDuration } from '../utils/time'

interface Props {
  timer: TimerStatus
  stats?: DashboardStats
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export const TimerCard = ({ timer, stats, onStart, onStop, disabled }: Props) => {
  const label = timer.running ? 'Stop Practice' : 'Start Practice'
  const action = timer.running ? onStop : onStart
  const description = timer.running
    ? 'Tracking deliberate practice…'
    : 'Ready when you are.'

  return (
    <div className="card timer-card">
      <div>
        <p className="muted">Current session</p>
        <h1 className="timer-display">{formatDuration(Math.max(timer.elapsed_seconds, 0))}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="timer-actions">
        <button className="primary large" disabled={disabled} onClick={action}>
          {label}
        </button>
        {timer.last_reason && !timer.running && (
          <span className="muted tiny">Paused: {timer.last_reason}</span>
        )}
      </div>
      {stats && (
        <div className="timer-meta">
          <div>
            <span className="muted tiny">Today</span>
            <strong>{stats.today_hours.toFixed(2)}h</strong>
          </div>
          <div>
            <span className="muted tiny">Streak</span>
            <strong>{stats.streak_days} days</strong>
          </div>
          <div>
            <span className="muted tiny">Goal</span>
            <strong>
              {stats.todays_goal_hours.toFixed(2)} / {stats.daily_goal_hours.toFixed(2)}h
            </strong>
          </div>
        </div>
      )}
    </div>
  )
}
