export interface TimerStatus {
  is_running: boolean;
  accumulated_seconds: number;
  start_time: string | null;
}

export interface Session {
  id: number;
  skill_id: number;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  reflection_text: string | null;
}

export interface DashboardStats {
  today_hours: number;
  week_hours: number;
  month_hours: number;
  total_hours: number;
  progress_percentage: number;
  streak_days: number;
}

export interface AppSettings {
  daily_goal_minutes: number;
  idle_timeout_minutes: number;
  productivity_mode_enabled: boolean;
  target_skill_name: string;
}
