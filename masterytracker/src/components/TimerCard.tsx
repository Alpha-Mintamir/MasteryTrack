import { Play, Square } from 'lucide-react'
import type { GoalProgress } from '../types'

type TimerCardProps = {
  running: boolean
  formatted: string
  skillName: string
  goal: GoalProgress
  streakDays: number
  onStart: () => void
  onStop: () => void
}

export const TimerCard = ({
  running,
  formatted,
  skillName,
  goal,
  streakDays,
  onStart,
  onStop,
}: TimerCardProps) => {
  return (
    <section className="card timer-card">
      <div>
        <p className="muted">Focused skill</p>
        <h2>{skillName}</h2>
      </div>
      <div className="timer-display">
        <span className="timer-value">{formatted}</span>
        <p className="muted">current session</p>
      </div>
      <div className="timer-actions">
        <div>
          <p className="muted">Daily goal</p>
          <strong>
            {(goal.completed_minutes / 60).toFixed(1)} / {(goal.goal_minutes / 60).toFixed(1)} h
          </strong>
        </div>
        <div>
          <p className="muted">Streak</p>
          <strong>{streakDays} days</strong>
        </div>
        <button
          className={`timer-btn ${running ? 'stop' : 'start'}`}
          onClick={running ? onStop : onStart}
        >
          {running ? <Square size={18} /> : <Play size={18} />}
          {running ? 'Stop session' : 'Start practicing'}
        </button>
      </div>
    </section>
  )
}
