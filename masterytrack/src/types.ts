export type ISODate = string

export interface TimerStatus {
  running: boolean
  started_at?: ISODate | null
  elapsed_seconds: number
  auto_paused: boolean
  last_reason?: string | null
}

export interface StartTimerResponse {
  session_id: number
  started_at: ISODate
}

export interface DashboardStats {
  today_hours: number
  week_hours: number
  month_hours: number
  total_hours: number
  goal_progress: number
  total_hours_target: number
  daily_goal_hours: number
  todays_goal_hours: number
  streak_days: number
}

export interface SessionHistoryRow {
  id: number
  start: ISODate
  end?: ISODate | null
  duration_minutes: number
  notes?: string | null
  what_practiced?: string | null
  what_learned?: string | null
  next_focus?: string | null
}

export interface ReflectionInput {
  notes?: string
  what_practiced?: string
  what_learned?: string
  next_focus?: string
}

export interface AppSettings {
  skill_name: string
  daily_goal_minutes: number
  idle_timeout_minutes: number
  productivity_mode_enabled: boolean
  allowed_apps: string[]
  blocked_apps: string[]
  auto_backup_path?: string | null
  screenshot_enabled: boolean
  screenshot_storage_path?: string | null
  screenshot_retention_days: number
  music_enabled: boolean
  music_playlist_type: string
  music_volume: number
  music_auto_play: boolean
  music_custom_playlist_url?: string | null
}

export interface ExportRequest {
  format: 'csv' | 'json'
  target_dir?: string
  include_settings?: boolean
}

export interface ImportRequest {
  file_path: string
  import_settings?: boolean
}

export interface GoalNotification {
  achieved_at: ISODate
  total_minutes: number
}
