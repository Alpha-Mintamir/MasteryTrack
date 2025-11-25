interface Props {
  message: string
  tone?: 'info' | 'success' | 'warning'
  onClose?: () => void
}

export const Banner = ({ message, tone = 'info', onClose }: Props) => {
  return (
    <div className={`banner banner--${tone}`}>
      <span>{message}</span>
      {onClose && (
        <button className="ghost" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  )
}
