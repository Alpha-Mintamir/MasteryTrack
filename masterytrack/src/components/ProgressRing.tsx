import './ProgressRing.css'

interface Props {
  progress: number
  size?: number
  stroke?: number
  label?: string
}

export const ProgressRing = ({ progress, size = 160, stroke = 10, label }: Props) => {
  const normalized = Math.min(Math.max(progress, 0), 1)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - normalized * circumference

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="progress-ring__bg"
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="progress-ring__value"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="progress-ring__center">
        <strong>{Math.round(normalized * 100)}%</strong>
        {label && <span>{label}</span>}
      </div>
    </div>
  )
}
