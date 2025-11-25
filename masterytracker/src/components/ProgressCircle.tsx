import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

type Props = {
  value: number
  label: string
  subtitle?: string
  accent?: string
}

export const ProgressCircle = ({ value, label, subtitle, accent = '#5de4c7' }: Props) => {
  return (
    <div className="progress-circle">
      <CircularProgressbar
        value={value}
        text={`${Math.round(value)}%`}
        strokeWidth={10}
        styles={buildStyles({
          pathColor: accent,
          trailColor: 'var(--border)',
          textColor: 'var(--text)',
        })}
      />
      <div className="progress-meta">
        <p className="muted">{label}</p>
        {subtitle && <strong>{subtitle}</strong>}
      </div>
    </div>
  )
}
