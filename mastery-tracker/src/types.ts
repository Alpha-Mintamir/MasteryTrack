export interface Session {
  id: number;
  skill_id: number;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  reflection_text: string | null;
}

export interface Settings {
  id: number;
  daily_goal_minutes: number;
  idle_timeout_minutes: number;
  productivity_mode_enabled: boolean;
  theme: string;
}

export interface DashboardStats {
  today_hours: number;
  week_hours: number;
  month_hours: number;
  total_hours: number;
  progress_percentage: number;
  streak_days: number;
  daily_goal_hours: number;
  daily_progress_percentage: number;
}

export interface TimerInfo {
  is_running: boolean;
  elapsed_seconds: number;
  is_paused: boolean;
  start_time: string | null;
}
