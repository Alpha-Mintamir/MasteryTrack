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
}

export interface ExportRequest {
  format: 'csv' | 'json'
  target_dir?: string
}

export interface GoalNotification {
  achieved_at: ISODate
  total_minutes: number
}
