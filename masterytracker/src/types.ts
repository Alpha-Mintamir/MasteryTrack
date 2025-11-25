export type SessionRecord = {
  id: number
  skill_id: number
  skill_name: string
  start_time: string
  end_time?: string | null
  duration_minutes: number
  reflection_practice?: string | null
  reflection_learning?: string | null
  reflection_next?: string | null
  notes?: string | null
}

export type SessionCollection = {
  data: SessionRecord[]
  total: number
}

export type SessionEditPayload = {
  id: number
  start_time: string
  end_time: string
  notes?: string | null
  reflection_practice?: string | null
  reflection_learning?: string | null
  reflection_next?: string | null
}

export type ReflectionInput = {
  practiced?: string
  learned?: string
  next_focus?: string
  notes?: string
}

export type DashboardStats = {
  today_minutes: number
  week_minutes: number
  month_minutes: number
  total_minutes: number
  ten_k_progress: ProgressSlice
  daily_goal: GoalProgress
  streak_days: number
}

export type ProgressSlice = {
  percentage: number
  remaining_minutes: number
}

export type GoalProgress = {
  goal_minutes: number
  completed_minutes: number
  percentage: number
}

export type AppSettings = {
  id: number
  target_skill_name: string
  skill_id: number
  daily_goal_minutes: number
  idle_timeout_minutes: number
  productivity_mode_enabled: boolean
  productivity_allowlist: string[]
  productivity_blocklist: string[]
  auto_backup_path?: string | null
}

export type SettingsUpdate = Partial<{
  target_skill_name: string
  daily_goal_minutes: number
  idle_timeout_minutes: number
  productivity_mode_enabled: boolean
  productivity_allowlist: string[]
  productivity_blocklist: string[]
  auto_backup_path: string | null
}>

export type TimerStatusPayload = {
  running: boolean
  session_id?: number
  started_at?: string
}

export type TimerTickPayload = {
  session_id: number
  started_at: string
  elapsed_seconds: number
}

export type ExportFormat = 'csv' | 'json'

export type ExportPayload = {
  path: string
  format: ExportFormat
}
