import { invoke } from '@tauri-apps/api/core'
import type {
  AppSettings,
  DashboardStats,
  ExportFormat,
  ExportPayload,
  ReflectionInput,
  SessionCollection,
  SessionEditPayload,
  SessionRecord,
  SettingsUpdate,
} from '../types'

export const startTimer = (skillName?: string | null) =>
  invoke<SessionRecord>('start_timer', { skillName })

export const stopTimer = (reflection?: ReflectionInput) =>
  invoke<SessionRecord>('stop_timer', { reflection })

export const fetchActiveSession = () => invoke<SessionRecord | null>('active_session')

export const fetchDashboard = () => invoke<DashboardStats>('dashboard')

export const fetchSessions = (limit = 25, offset = 0) =>
  invoke<SessionCollection>('get_sessions', { limit, offset })

export const updateSession = (payload: SessionEditPayload) =>
  invoke<SessionRecord>('edit_session', { payload })

export const removeSession = (id: number) => invoke<void>('delete_session', { id })

export const fetchSettings = () => invoke<AppSettings>('get_settings')

export const saveSettings = (payload: SettingsUpdate) =>
  invoke<AppSettings>('update_settings', { payload })

export const exportData = (format: ExportFormat) =>
  invoke<ExportPayload>('export_sessions', { format })

export const backupNow = (path: string) => invoke<string>('manual_backup', { path })

export const saveReflection = (sessionId: number, reflection: ReflectionInput) =>
  invoke<SessionRecord>('save_reflection_fields', { sessionId, reflection })
