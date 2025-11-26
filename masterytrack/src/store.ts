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
  importing: boolean
  lastExportPath?: string
  loadInitial: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshSessions: () => Promise<void>
  refreshSettings: () => Promise<void>
  startTimer: () => Promise<void>
  stopTimer: (payload: ReflectionInput) => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<void>
  exportData: (format: 'csv' | 'json', includeSettings?: boolean) => Promise<string>
  importData: (file: File) => Promise<void>
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
  importing: false,
  loadInitial: async () => {
    try {
      const [timer, stats, sessions, settings] = await Promise.all([
        invoke<TimerStatus>('timer_status').catch(err => {
          console.error('Failed to load timer_status:', err)
          throw err
        }),
        invoke<DashboardStats>('dashboard').catch(err => {
          console.error('Failed to load dashboard:', err)
          throw err
        }),
        invoke<SessionHistoryRow[]>('sessions').catch(err => {
          console.error('Failed to load sessions:', err)
          throw err
        }),
        invoke<AppSettings>('load_settings').catch(err => {
          console.error('Failed to load settings:', err)
          throw err
        }),
      ])
      set({
        timer,
        stats,
        sessions,
        settings,
      })
    } catch (error) {
      console.error('Error in loadInitial:', error)
      throw error
    }
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
  exportData: async (format: 'csv' | 'json', includeSettings = true) => {
    set({ exporting: true })
    try {
      const path = await invoke<string>('export_data', {
        request: { format, include_settings: includeSettings },
      })
      set({ lastExportPath: path })
      return path
    } finally {
      set({ exporting: false })
    }
  },
  importData: async (file: File) => {
    set({ importing: true })
    try {
      // Read file content
      const text = await file.text()
      
      // Detect if file contains settings
      let importSettings = false
      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text)
          importSettings = json.settings !== undefined
        } catch {
          // Not JSON or invalid, skip settings detection
        }
      } else if (file.name.endsWith('.csv')) {
        // Check for settings in CSV metadata
        importSettings = text.includes('# Settings JSON:')
      }
      
      // Create a temporary file path and write content via backend
      const tempDir = await invoke<string>('get_temp_dir')
      const fileName = file.name.split('.').pop() || 'txt'
      const tempPath = `${tempDir}/masterytrack-import-${Date.now()}.${fileName}`
      
      // Write file content via backend
      await invoke('write_temp_file', {
        path: tempPath,
        content: text,
      })
      
      // Import data
      await invoke('import_data', {
        request: {
          file_path: tempPath,
          import_settings: importSettings,
        },
      })
      
      // Refresh all data
      await Promise.all([
        get().refreshStats(),
        get().refreshSessions(),
        get().refreshSettings(),
      ])
    } catch (error) {
      console.error('Import failed:', error)
      throw error
    } finally {
      set({ importing: false })
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
