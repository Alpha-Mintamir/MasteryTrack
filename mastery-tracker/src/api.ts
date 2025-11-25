import { invoke } from '@tauri-apps/api/core';
import { Session, Settings, DashboardStats, TimerInfo } from './types';

// Timer API
export const startTimer = (): Promise<number> => invoke('start_timer');
export const stopTimer = (reflection?: string): Promise<void> => 
  invoke('stop_timer', { reflection });
export const pauseTimer = (): Promise<void> => invoke('pause_timer');
export const resumeTimer = (): Promise<void> => invoke('resume_timer');
export const getTimerInfo = (): Promise<TimerInfo> => invoke('get_timer_info');

// Session API
export const getSessions = (): Promise<Session[]> => invoke('get_sessions');
export const updateSession = (
  id: number,
  startTime: string,
  endTime: string,
  reflection?: string
): Promise<void> => invoke('update_session', { id, start_time: startTime, end_time: endTime, reflection });
export const deleteSession = (id: number): Promise<void> => invoke('delete_session', { id });

// Dashboard API
export const getDashboardStats = (): Promise<DashboardStats> => invoke('get_dashboard_stats');

// Settings API
export const getSettings = (): Promise<Settings> => invoke('get_settings');
export const updateSettings = (settings: Settings): Promise<void> => invoke('update_settings', { settings });
export const updateSkillName = (name: string): Promise<void> => invoke('update_skill_name', { name });
export const getSkillName = (): Promise<string> => invoke('get_skill_name');

// Export API
export const exportCsv = (): Promise<string> => invoke('export_csv');
export const exportJson = (): Promise<string> => invoke('export_json');
