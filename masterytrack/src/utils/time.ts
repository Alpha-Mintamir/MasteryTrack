import dayjs from 'dayjs'

export const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hrs, mins, secs]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export const formatHours = (hours: number) => `${hours.toFixed(2)}h`

export const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—'
  return dayjs(iso).format('MMM D, YYYY · HH:mm')
}

export const formatDate = (iso?: string | null) => {
  if (!iso) return '—'
  return dayjs(iso).format('MMM D, YYYY')
}
