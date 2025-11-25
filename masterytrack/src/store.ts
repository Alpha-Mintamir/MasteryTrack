import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type {
  AppSettings,
  DashboardStats,
  ReflectionInput,
  SessionHistoryRow,
  TimerStatus,
} from './types'

interface TrackerState {
  timer: TimerStatus
  stats?: DashboardStats
  sessions: SessionHistoryRow[]
  settings?: AppSettings
  reflectionDraft: ReflectionInput
  reflectionOpen: boolean
  exporting: boolean
  lastExportPath?: string
  loadInitial: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshSessions: () => Promise<void>
  refreshSettings: () => Promise<void>
  startTimer: () => Promise<void>
  stopTimer: (payload: ReflectionInput) => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<void>
  exportData: (format: 'csv' | 'json') => Promise<string>
  setReflectionOpen: (open: boolean, preset?: ReflectionInput) => void
  setTimer: (status: TimerStatus) => void
  updateReflectionDraft: (draft: ReflectionInput) => void
}

const defaultTimer: TimerStatus = {
  running: false,
  started_at: null,
  elapsed_seconds: 0,
  auto_paused: false,
  last_reason: null,
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  timer: defaultTimer,
  sessions: [],
  reflectionDraft: {},
  reflectionOpen: false,
  exporting: false,
  loadInitial: async () => {
    const [timer, stats, sessions, settings] = await Promise.all([
      invoke<TimerStatus>('timer_status'),
      invoke<DashboardStats>('dashboard'),
      invoke<SessionHistoryRow[]>('sessions'),
      invoke<AppSettings>('load_settings'),
    ])
    set({
      timer,
      stats,
      sessions,
      settings,
    })
  },
  refreshStats: async () => {
    const stats = await invoke<DashboardStats>('dashboard')
    set({ stats })
  },
  refreshSessions: async () => {
    const sessions = await invoke<SessionHistoryRow[]>('sessions')
    set({ sessions })
  },
  refreshSettings: async () => {
    const settings = await invoke<AppSettings>('load_settings')
    set({ settings })
  },
  startTimer: async () => {
    await invoke('start_timer')
    await get().refreshStats()
    const timer = await invoke<TimerStatus>('timer_status')
    set({ timer })
  },
  stopTimer: async (payload: ReflectionInput) => {
    await invoke<number>('stop_timer', { reflections: payload })
    set({ reflectionOpen: false, reflectionDraft: {} })
    await Promise.all([get().refreshStats(), get().refreshSessions()])
    const timer = await invoke<TimerStatus>('timer_status')
    set({ timer })
  },
  saveSettings: async (settings: AppSettings) => {
    const updated = await invoke<AppSettings>('persist_settings', {
      newSettings: settings,
    })
    set({ settings: updated })
  },
  exportData: async (format: 'csv' | 'json') => {
    set({ exporting: true })
    try {
      const path = await invoke<string>('export_data', {
        request: { format },
      })
      set({ lastExportPath: path })
      return path
    } finally {
      set({ exporting: false })
    }
  },
  setReflectionOpen: (open, preset) =>
    set({
      reflectionOpen: open,
      reflectionDraft: preset ?? {},
    }),
  setTimer: (timer) => set({ timer }),
  updateReflectionDraft: (draft) => set({ reflectionDraft: draft }),
}))
