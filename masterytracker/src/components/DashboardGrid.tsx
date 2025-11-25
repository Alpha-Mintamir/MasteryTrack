import type { DashboardStats } from '../types'
import { ProgressCircle } from './ProgressCircle'

type Props = {
  stats?: DashboardStats
}

const Metric = ({
  label,
  value,
  suffix = 'h',
}: {
  label: string
  value: number
  suffix?: string
}) => {
  return (
    <div className="metric">
      <p className="muted">{label}</p>
      <strong>
        {(value / 60).toFixed(1)}
        <span className="muted"> {suffix}</span>
      </strong>
    </div>
  )
}

export const DashboardGrid = ({ stats }: Props) => {
  if (!stats) return null
  return (
    <section className="card dashboard-grid">
      <div className="metrics">
        <Metric label="Today" value={stats.today_minutes} />
        <Metric label="This week" value={stats.week_minutes} />
        <Metric label="This month" value={stats.month_minutes} />
        <Metric label="Total accumulated" value={stats.total_minutes} />
      </div>
      <div className="progress-row">
        <ProgressCircle
          value={stats.daily_goal.percentage}
          label="Daily goal"
          subtitle={`${(stats.daily_goal.completed_minutes / 60).toFixed(1)} / ${
            stats.daily_goal.goal_minutes / 60
          } h`}
          accent="#7c6df6"
        />
        <ProgressCircle
          value={stats.ten_k_progress.percentage}
          label="10,000 hours"
          subtitle={`${(stats.total_minutes / 60).toFixed(1)} h logged`}
          accent="#5de4c7"
        />
        <div className="metric streak-card">
          <p className="muted">Streak</p>
          <strong>{stats.streak_days} days</strong>
          <small>Keeps counting with ≥1 minute logged</small>
        </div>
      </div>
    </section>
  )
}
